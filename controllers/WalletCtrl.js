const express = require('express');
const moment = require('moment');
const paginate = require('express-paginate');
const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const WithdrawModel = require('../models/withdraw');
const FortunaHistoryModel = require('../models/fortunaHistory');
const axios = require('axios').default;
const Web3 = require("web3");
const EthereumTx = require('ethereumjs-tx').Transaction;
const Common = require('ethereumjs-common').default;
const ethNetwork = 'https://polygon-mainnet.infura.io/v3/f15a5d7c1ea54d0c87b42cfa0bc1f4f6';
const web3 = new Web3(new Web3.providers.HttpProvider(ethNetwork));
const fs = require('fs');
const commonMatic = Common.forCustomChain(
    'mainnet',
    {
        name: 'matic-mainnet',
        networkId: 137,
        chainId: 137,
        url: 'https://rpc-mainnet.maticvigil.com/'
    },
    'petersburg'
)

async function Sleep(waitTime) {
    return new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve(true);
        }, waitTime);
    });
}

async function getCurrentGasPrices() {
    let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    let prices = {
        low: response.data.safeLow / 10,
        medium: response.data.average / 10,
        high: response.data.fast / 10
    };
    return prices;
}


async function getAvailableAmount(myTelegramId) {

    let result = await ResultModel.aggregate([
        {
            $match: { telegramId: myTelegramId + '' }
        },
        {
            $group:
                {
                    _id: "$telegramId",
                    totalPoints: { $sum: "$fortuna_points" }
                }
        }
    ]);

    let withdraws = await WithdrawModel.aggregate([
        {
            $match: { telegramId: myTelegramId + '' }
        },
        {
            $group:
                {
                    _id: "$telegramId",
                    totalPoints: { $sum: "$amount" }
                }
        }
    ]);

    let totalPoints = result.length > 0 ? result[0].totalPoints : 0;
    let withdrawAmounts = withdraws.length > 0 ? withdraws[0].totalPoints : 0;
    let amount = totalPoints - withdrawAmounts

    return amount;
}

async function sendByMainnet(receiverAddr, amount) {
    let sendersData = {
        addr: '0xaE8D780f0edd64735DDDE9e5DBC34952D4d23379',
        privateKey: 'f54ebb147a9eca7e44c99292f636f4753d81b543fc80f3d681494d6a21352729'
    };

    let nonce = await web3.eth.getTransactionCount(sendersData.addr);

    let abiArray = JSON.parse(fs.readFileSync(__dirname + '/../contract/fortuna_abi.json', 'utf-8'));
    let contractAddress = "0xDD7F60c55b0DFC69F9fD20636E97FE18013B7F54";
    let contract = new web3.eth.Contract(abiArray, contractAddress);
    let gasPrices = await getCurrentGasPrices();

    let rawTransaction = {
        from: sendersData.addr,
        nonce: web3.utils.toHex(nonce),
        gasLimit: web3.utils.toHex(800000), // Raise the gas limit to a much higher amount
        gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei')),
        // "gas": 21000,
        // "gasPrice": gasPrices.high * 1000000000,
        to: contractAddress,
        value: "0x0",
        data: contract.methods.transfer(receiverAddr, 100 * amount).encodeABI(),        // 100 = 1FRT
        chainId: 137
    };

    let privKey = Buffer.from(sendersData.privateKey,'hex');
    let tx = new EthereumTx(rawTransaction, {common : commonMatic});

    tx.sign(privKey);
    let serializedTx = tx.serialize();

    try {
        await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
    } catch (err) {
        console.log('send-error:', err);
    }
}


module.exports = function(){

    return {
        index: async function(req, res) {
            let myTelegramId = res.locals.user.telegramId;

            let result = await FortunaHistoryModel.aggregate([
                {
                    $match: { telegramId: myTelegramId + '' }
                },
                {
                    $group:
                        {
                            _id: "$telegramId",
                            totalPoints: { $sum: "$fortuna_point" }
                        }
                }
            ]);

            console.log('wallet-result:', result);

            let totalPoints = result.length > 0 ? result[0].totalPoints : 0;

            res.locals = {...res.locals, title: 'Profile', moment };

            let filter = req.query.filter || -1;
            let page = req.query.page || 1;

            let searchQuery = {telegramId: myTelegramId, fortuna_point: {$ne: 0}};
            if (filter >= 0) {
                searchQuery = {...searchQuery, state: filter};
            }

            const [ histories, itemCount ] = await Promise.all([
                FortunaHistoryModel.find(searchQuery).sort({created_at: -1}).limit(req.query.limit).skip(req.skip).lean().exec(),
                FortunaHistoryModel.count(searchQuery)
            ]);
            const pageCount = Math.ceil(itemCount / req.query.limit);

            let types = ['Received by Answering to Quizees', 'Received by Tip', 'Send Tip', 'Withdraw to FRT Token'];

            res.render('Wallet/index', {
                availableAmount: totalPoints,
                error: req.flash('error'),
                message: req.flash('success'),
                histories,
                pageCount,
                itemCount,
                filter,
                types,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
            });
        },

        withdraw: async function(req, res) {

            let myTelegramId = res.locals.user.telegramId;

            let amount = (await getAvailableAmount(myTelegramId)).toFixed(1);

            if (amount < 100) {
                req.flash('error', 'Minimum request amount is 100');
                return res.redirect('/wallet');
            }

            let history = new WithdrawModel({
                telegramId: myTelegramId,
                amount: amount,
                status: 0
            });

            let hItem = new FortunaHistoryModel({
                telegramId: myTelegramId,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
                fortuna_point: -amount,
                state: 3,
                walletAddr: req.body.addr
            });

            try {
                history = await history.save();
                hitem = await hItem.save();
            } catch (e) {
                console.log('save-history-err:', e);
            }


            await Sleep(1000);

            let newAmount = (await getAvailableAmount(myTelegramId)).toFixed(1);

            if (newAmount < 0) {
                await WithdrawModel.remove({_id: history._id});
                await FortunaHistoryModel.remove({_id: hItem._id});
                return res.json({result: 'success'});
            }

            let receiverAddr = req.body.addr;

            await sendByMainnet(receiverAddr, amount);

            req.flash('success', 'You got ' + amount + ' FRT token. Please check your wallet.');
            return res.redirect('/wallet');
        }
    };

};
