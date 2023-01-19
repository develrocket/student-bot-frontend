const CryptoUserModel = require('../../models/cryptoUser');
const CryptoWalletModel = require('../../models/cryptoWallet');
const Web3 = require('web3');
const { RPCClient } = require("rpc-bitcoin");
const solanaWeb3 = require('@solana/web3.js');
const moment = require('moment');
const axios = require('axios').default;

const url = "http://218.50.149.74";
const user = "escare";
const pass = "escare12#$";
const port = 500;
const timeout = 10000;
const btcClient = new RPCClient({ url, port, timeout, user, pass });

const web3 = new Web3(new Web3.providers.HttpProvider('http://218.50.149.74:8546'));
// const Solana = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');
const Solana = new solanaWeb3.Connection('https://api.testnet.solana.com');
const ETH_API_KEY = "KCXYS8CQZTSMQPFCHF2A42N3DBX577IBCI";

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
            let myAddr = req.body.addr;
            let startDate = req.body.startDate;
            let endDate = req.body.endDate;
            let sortBy = req.body.sortBy;
            let searchKey = req.body.searchKey;

            console.log('get-eth-transactions');

            let url = 'https://api.etherscan.io/api' +
                '?module=account' +
                '&action=txlist' +
                '&address=' + address +
                '&tag=latest' +
                '&apikey=' + ETH_API_KEY;

            let config = {
                method: 'get',
                url: url,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            let response = await axios(config);

            let result = [];

            if (response.data.status == 1) {
                let list = response.data.result;

                for (let i = 0; i < list.length; i++) {
                    let item = list[i];
                    let source = item.from;
                    let destination = item.to;
                    let amount = item.value;
                    amount = (amount !== 0) ? web3.utils.fromWei(amount, 'ether') : 0;
                    let fee = item.gasUsed;
                    fee = (fee !== 0) ? web3.utils.fromWei(fee, 'ether') : 0;
                    let txId = item.hash;
                    let memo = web3.utils.hexToAscii(item.input);
                    let status = item.txreceipt_status == 1 ? 'confirmed' : 'failed';
                    let address = destination == myAddr ? source : destination;
                    let transType = destination == myAddr ? 'received' : 'sent';
                    let createdAt = moment(item.timeStamp * 1000).format('YYYY-MM-DD');

                    if (createdAt >= startDate && createdAt <= endDate) {
                        if (searchKey) {
                            if (source.toLowerCase().indexOf(searchKey.toLowerCase()) < 0 && destination.toLowerCase().indexOf(searchKey.toLowerCase()) < 0) continue;
                        }
                        result.push({
                            crypto_type: 'eth',
                            address: address,
                            amount: amount,
                            transaction_type: transType,
                            time: item.blockTime * 1000,
                            fee: fee,
                            txId: txId,
                            memo: memo,
                            status: status,
                            source: source,
                            destination: destination
                        });
                    }
                }

                if (sortBy == '2') {
                    result = result.reverse();
                }
            }

            return res.json({result: result});
        },

        getSOLTransactions: async function(req, res) {
            let myAddr = req.body.addr;
            let startDate = req.body.startDate;
            let endDate = req.body.endDate;
            let sortBy = req.body.sortBy;
            let searchKey = req.body.searchKey;

            console.log('get-sol-transactions');

            const pubKey = new solanaWeb3.PublicKey(myAddr);
            let transactionList = await Solana.getSignaturesForAddress(pubKey, {limit:1000});

            let signatureList = transactionList.map(transaction=>transaction.signature);
            let transactionDetails = await Solana.getParsedTransactions(signatureList, {maxSupportedTransactionVersion:0});


            console.log('transaction-list:', JSON.stringify(transactionList));
            console.log('transactions:', JSON.stringify(transactionDetails));

            let result = [];
            for (let i = 0; i < transactionDetails.length; i ++) {
                let item = transactionDetails[i];
                let destination = item.transaction.message.instructions[0].parsed.info.destination;
                let source = item.transaction.message.instructions[0].parsed.info.source;
                let amount = item.transaction.message.instructions[0].parsed.info.lamports / solanaWeb3.LAMPORTS_PER_SOL;
                let fee = item.meta.fee / solanaWeb3.LAMPORTS_PER_SOL;
                let txId = transactionList[i].signature;
                let memo = transactionList[i].memo;
                let status = transactionList[i].confirmationStatus;
                let address = destination == myAddr ? source : destination;
                let transType = destination == myAddr ? 'received' : 'sent';
                let createdAt = moment(item.blockTime * 1000).format('YYYY-MM-DD');
                if (createdAt >= startDate && createdAt <= endDate) {
                    if (searchKey) {
                        if (source.toLowerCase().indexOf(searchKey.toLowerCase()) < 0 && destination.toLowerCase().indexOf(searchKey.toLowerCase()) < 0) continue;
                    }
                    result.push({
                        crypto_type: 'sol',
                        address: address,
                        amount: amount,
                        transaction_type: transType,
                        time: item.blockTime * 1000,
                        fee: fee,
                        txId: txId,
                        memo: memo,
                        status: status,
                        source: source,
                        destination: destination
                    });
                }
            }

            if (sortBy == '2') {
                result = result.reverse();
            }

            return res.json({result: result});
        },

        createBtcWallet: async function (req, res) {
            const result = await btcClient.createwallet({
                wallet_name: 'walletName',
                disable_private_keys: true,
                blank: true
            });

            console.log('create-btc-wallet-result:', result);

            return res.json({result: 'failed'});
        },

        createEthWallet: async function (req, res) {
            let version = web3.version;
            console.log('web3-version:', version);
            const account = web3.eth.accounts.create();
            let accountAddress = account.address;
            let privateKey = account.privateKey;

            console.log('create-eth-wallet-result:', accountAddress, privateKey);

            return res.json({result: 'success', addr: accountAddress, pk: privateKey});
        },

        createSolanaWallet: async function (req, res) {

            try {
                const recentBlock = await Solana.getEpochInfo();
                console.log("~~~~~~~~~~~~~~~~~NEW BLOCK~~~~~~~~~~~~\n", recentBlock);
                const keyPair = solanaWeb3.Keypair.generate();

                console.log("Public Key:", keyPair.publicKey.toString());
                console.log("Secret Key:",keyPair.secretKey);

                return res.json({
                    result: 'success',
                    address: keyPair.publicKey.toString(),
                    pk: keyPair.secretKey
                });

            } catch (e) {

            }


            return res.json({result: 'failed'})
        },

        sendSolana: async function(req, res) {
            try {

                console.log('send-solana-body:', JSON.stringify(req.body));

                let toAddress = new solanaWeb3.PublicKey(req.body.to_addr);
                let fromSecret = req.body.from_secret;
                let amount = req.body.amount;
                let memo = req.body.memo;

                let fromKeyPair = solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(fromSecret.split(',')));

                let transaction = new solanaWeb3.Transaction();

                transaction.add(solanaWeb3.SystemProgram.transfer({
                    fromPubkey: fromKeyPair.publicKey,
                    toPubkey: toAddress,
                    lamports: solanaWeb3.LAMPORTS_PER_SOL * amount,
                    seed: memo
                }));

                solanaWeb3.sendAndConfirmTransaction(Solana, transaction, [fromKeyPair]);
                return res.json({result: 'success'});
            } catch (e) {
                console.log('solana-send-amount-error:', e);
            }

            return res.json({result: 'failed'});
        },

        getSolBalance: async function(req, res) {
            console.log('get-sol-balance-of:', req.body.addr);
            try {
                let pubKey = new solanaWeb3.PublicKey(req.body.addr);
                let stakeBalance = await Solana.getBalance(pubKey);
                console.log(`Stake balance: ${stakeBalance}`);
                return res.json({
                    result: 'success',
                    balance: stakeBalance / solanaWeb3.LAMPORTS_PER_SOL
                });
            } catch (e) {
                console.log('sol-balance-err:', e);
            }

            return res.json({result: 'failed'});
        },

        getEthBalance: async function(req, res) {
            console.log('get-eth-balance-of:', req.body.addr);
            try {
                let address = req.body.addr;
                // let address = '0xD351d6b0f71f2d5D727C1787f28d85eB56C7FCEf';

                // let balance = await web3.eth.getBalance(address);
                // console.log(`Eth balance-1: ${balance}`);
                // balance = (balance !== 0) ? web3.utils.fromWei(balance, 'ether') : 0;
                // console.log(`Eth balance-2: ${balance}`);


                let url = 'https://api.etherscan.io/api' +
                    '?module=account' +
                    '&action=balance' +
                    '&address=' + address +
                    '&tag=latest' +
                    '&apikey=' + ETH_API_KEY;

                console.log('get-eth-balance-url:', url);


                let config = {
                    method: 'get',
                    url: url,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                };

                let result = await axios(config);
                let balance = 0;

                console.log('get-eth-balance-result:', result.data);

                if (result.data.status == 1) {
                    balance = result.data.result;
                    balance = (balance !== 0) ? web3.utils.fromWei(balance, 'ether') : 0;
                }

                return res.json({
                    result: 'success',
                    balance: balance
                })

            } catch (e) {
                console.log('eth-balance-err:', e);
            }

            return res.json({result: 'failed'});
        }
    }
}