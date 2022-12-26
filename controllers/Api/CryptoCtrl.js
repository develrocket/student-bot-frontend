const CryptoUserModel = require('../../models/cryptoUser');
const CryptoWalletModel = require('../../models/cryptoWallet');

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
        }
    }
}