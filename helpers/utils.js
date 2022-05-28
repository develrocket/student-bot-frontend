const TitleModel = require('../models/studentTitle');
const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');

module.exports = {
    randomString(length) {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHUJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < length; i += 1) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    excelDateToJSDate(excelDate) {
        const date = new Date(Math.round((excelDate - (25567 + 1)) * 86400 * 1000));
        const converted_date = date.toISOString().split('T')[0];
        return converted_date;
    },

    async getTitle(sumPoint) {
        const titles = await TitleModel.find();
        for (let i = 1; i < titles.length; i++) {
            if (sumPoint < titles[i].limit) {
                return titles[i - 1].title;
            }
        }
        return titles[0].title;
    },

    async getPupilsInfo() {
        const res = await ResultModel.find().sort({session_no: - 1});
        let pupilsInfo = [];

        for (const stuRes of res) {
            const filteredId = pupilsInfo.findIndex((item) => item.telegramId === stuRes.telegramId );
            if (filteredId < 0) {
                pupilsInfo.push(stuRes);
            }
        }

        return pupilsInfo;
    },

    async getProfileData(telegramId) {
        let result = await ResultModel.find({telegramId: telegramId * 1}).populate('session').sort({session_no: -1}).lean().exec();
        let joinDate = result.length > 0 ? result[result.length - 1].session.session_start : '';
        let sessionCount = await SessionModel.countDocuments({});
        let teleUser = result.length > 0 ? result[0] : {};

        let students = await ResultModel.aggregate([
            {
                $group:
                    {
                        _id: "$telegramId",
                        maxPoint: { $max: "$sum_point" }
                    }
            }
        ]);

        let results = [];
        for (let i = 0; i < students.length; i ++) {
            let item = students[i];
            let rlt = await ResultModel.find({telegramId: item._id}).sort({session_no: -1}).lean().exec();
            rlt = rlt[0];
            let ritem = {
                username: rlt.username,
                telegramId: rlt.telegramId,
                sum_point: rlt.sum_point,
                title: rlt.title,
            };
            if (results.length === 0) {
                results.push(ritem);
                continue;
            }
            let insert = false;
            for (let j = 0; j < results.length; j ++) {
                if (results[j].sum_point < ritem.sum_point) {
                    results.splice(j, 0, ritem);
                    insert = true;
                    break;
                }
            }
            if (!insert) {
                results.push(ritem);
            }
        }

        let rank = 0;
        for (let i = 0; i < results.length; i++) {
            if (telegramId + '' === results[i].telegramId + '') rank = i + 1;
        }

        let rankResult = await ResultModel.aggregate([
            {
                $match: { telegramId: telegramId + '' }
            },
            {
                $group: { _id: "$session_rank", count: { $sum: 1 } }
            }
        ]);

        let rResult = [0, 0, 0];
        for (let i = 0; i < 3; i ++) {
            for (let j = 0; j < rankResult.length; j ++) {
                if (rankResult[j]._id + '' == i + 1 + '') {
                    rResult[i] = rankResult[j].count;
                }
            }
        }

        return {joinDate, result, sessionCount, rank, teleUser, rResult};
    }
};
