const CryptoUserModel = require('../../models/cryptoUser');
const CryptoWalletModel = require('../../models/cryptoWallet');
const Web3 = require('web3');
const { RPCClient } = require("rpc-bitcoin");

const url = "http://121.140.164.20";
const user = "BrecaBr3CradRUvicROp";
const pass = "PhoHofr8jahospOniwrl";
const port = 3298;
const timeout = 10000;
const btcClient = new RPCClient({ url, port, timeout, user, pass });

const web3 = new Web3(new Web3.providers.HttpProvider('http://121.140.164.20:4163'));

module.exports = function() {
    return {
        registerUser: async function (req, res) {
            let accountId = req.body.account_id;
            let custNo = req.body.cust_no;

            const newUser = new CryptoUserModel();
            newUser.account_id = accountId;
            newUser.cust_no = custNo;
            await newUser.save();

            return res.json({result: 'success'});
        },

        updateUser: async function(req, res) {
            let accountId = req.body.account_id;
            let custNo = req.body.cust_no;

            await CryptoUserModel.update({account_id: accountId}, {$set: {
                    cust_no: custNo
                }});

            return res.json({result: 'success'});
        },

        saveWallet: async function(req, res) {
            let accountId = req.body.account_id;
            let custNo = req.body.cust_no;
            let type = req.body.type;
            let address = req.body.address;
            let secret = req.body.secret;
            let name = req.body.name;
            let balance = req.body.balance;
            let bigAddress = req.body.big_address;
            let password = req.body.password;

            let wallets = await CryptoWalletModel.find({account_id: accountId, type: type});
            if (wallets.length > 0) {
                await CryptoWalletModel.update({account_id: accountId, type: type}, {$set: {
                        cust_no: custNo,
                        type,
                        name,
                        address,
                        secret,
                        balance,
                        password,
                        big_address: bigAddress
                    }});
            } else {
                let wallet = new CryptoWalletModel({
                    account_id: accountId,
                    cust_no: custNo,
                    type,
                    name,
                    address,
                    secret,
                    balance,
                    password,
                    big_address: bigAddress
                });

                await wallet.save();
            }

            return res.json({result: 'success'});
        },

        loadWallet: async function(req, res) {
            let accountId = req.body.account_id;
            let wallets = await CryptoWalletModel.find({account_id: accountId});
            return res.json({wallets: wallets});
        },

        loadUser: async function(req, res) {
            let custNo = req.body.cust_no;
            let users = await CryptoUserModel.find({cust_no: custNo});
            if (users.length) {
                return res.json({result: 'success', user: users[0]});
            } else {
                return res.json({result: 'failed'});
            }
        },

        getETHTransactions: async function(req, res) {
            const account = web3.eth.accounts.create();
            console.log('account-address:', account);

            let myAddr = '0xD351d6b0f71f2d5D727C1787f28d85eB56C7FCEf';
            let currentBlock = await web3.eth.getBlock('latest');
            console.log('current-block:', currentBlock);
            let n = web3.eth.getTransactionCount(myAddr, currentBlock);
            let bal = web3.eth.getBalance(myAddr, currentBlock);
            // for (let i=currentBlock; i >= 0 && (n > 0 || bal > 0); --i) {
            for (let i=currentBlock; i >= currentBlock - 3; --i) {
                try {
                    let block = web3.eth.getBlock(i, true);
                    if (block && block.transactions) {
                        block.transactions.forEach(function(e) {
                            console.log('eth-transaction:', e)
                            if (myAddr == e.from) {
                                if (e.from != e.to)
                                    bal = bal.plus(e.value);
                                console.log(i, e.from, e.to, e.value.toString(10));
                            }
                            if (myAddr == e.to) {
                                if (e.from != e.to)
                                    bal = bal.minus(e.value);
                                console.log(i, e.from, e.to, e.value.toString(10));
                            }
                        });
                    }
                } catch (e) { console.error("Error in block " + i, e); }
            }

            return res.json({result: 'failed'});
        },

        createBtcWallet: async function (req, res) {
            const result = await btcClient.createwallet({
                wallet_name: 'walletName',
                disable_private_keys: true,
                blank: true
            });

            console.log('create-btc-wallet-result:', result);

            return res.json({result: 'failed'});
        }
    }
}