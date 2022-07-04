const TitleModel = require('../models/studentTitle');
const SessionModel = require('../models/sessionResult');
const ResultModel = require('../models/studentResult');
const StudentModel = require('../models/student');
const FortunaHistoryModel = require('../models/fortunaHistory');
const SkillModel = require('../models/skill');
const SkillHistoryModel = require('../models/skillHistory');
const MissionHistoryModel = require('../models/missionHistory');
const StudentPointHistoryModel = require('../models/studentPointHistory');

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
        return titles[titles.length - 1].title;
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
        console.log('get-profile-data-start:', new Date());
        let result = await ResultModel.find({telegramId: telegramId + ''}).populate('session').sort({session_no: -1}).lean().exec();
        let joinDate = result.length > 0 ? result[result.length - 1].session.session_start : '';
        let sessionCount = await SessionModel.countDocuments({});
        let teleUser = result.length > 0 ? result[0] : {};

        let student = await StudentModel.findOne({telegramId: telegramId});
        if (student) {
            teleUser.username = student.username;
        }

        let totalPoint = await StudentPointHistoryModel.aggregate([
            {
                $match: { telegramId: telegramId }
            },
            {
                $group:
                    {
                        _id: "$telegramId",
                        totalPoints: { $sum: "$point" },
                    }
            }
        ]);

        totalPoint = totalPoint.length > 0 ? totalPoint[0].totalPoints : 0;

        console.log('get-profile-data-after-total-point:', new Date());

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
        let sts = await StudentModel.find({}).lean().exec();
        let rlts = await ResultModel.aggregate([
            {
                $group:
                    {
                        _id: "$telegramId",
                        sum_point: {$sum: "$point" },
                        username: {$first: '$username'},
                        telegramId: {$first: '$telegramId'},
                        title: {$first: '$title'},
                    }
            },
            {$sort: {session_no: -1}}
        ]);

        for (let i = 0; i < students.length; i ++) {
            let item = students[i];
            // let rlt = await ResultModel.find({telegramId: item._id}).sort({session_no: -1}).lean().exec();
            let rlt = rlts.filter(ritem => ritem.telegramId + '' === item._id + '');
            rlt = rlt[0];
            let user = sts.filter(ritem => ritem.telegramId + '' === rlt.telegramId);
            if (user.length > 0) {
                user = user[0];
            } else {
                user = null;
            }


            let ritem = {
                username: rlt.username,
                telegramId: rlt.telegramId,
                sum_point: rlt.sum_point,
                country: user ? (user.countryCode ? user.countryCode : 'af') : 'af',
                title: rlt.title,
            };
            results.push(ritem);
        }

        console.log('get-profile-data-after-results:', new Date());

        let rank = 0;
        for (let i = 0; i < results.length; i++) {
            if (telegramId + '' === results[i].telegramId + '') rank = i + 1;
        }

        let startIndex = rank - 6;
        let endIndex = rank + 4;

        startIndex = startIndex < 0 ? 0 : startIndex;
        endIndex = endIndex >= results.length ? results.length - 1: endIndex;

        let myParts = [];
        for (let i = startIndex; i <= endIndex; i ++) {
            let item = results[i];
            item.rank = i + 1;
            myParts.push(item);
        }

        let rankResult = await ResultModel.aggregate([
            {
                $match: { telegramId: telegramId + '' }
            },
            {
                $group: { _id: "$session_rank", count: { $sum: 1 } }
            }
        ]);

        let rResult = [
            {count: 0, sessions: []},
            {count: 0, sessions: []},
            {count: 0, sessions: []}
        ];
        for (let i = 0; i < 3; i ++) {
            for (let j = 0; j < rankResult.length; j ++) {
                if (rankResult[j]._id + '' == i + 1 + '') {
                    let item = {
                        count: rankResult[j].count,
                        sessions: []
                    };

                    let sessions = await ResultModel.find({telegramId: telegramId, session_rank: i + 1}).populate('session').sort({session_no: -1}).lean().exec();
                    item.sessions = sessions;
                    rResult[i] = item;
                }
            }
        }

        console.log('get-profile-data-after-rank:', new Date());

        let user = await StudentModel.find({telegramId: telegramId}).lean().exec();
        let motto = user.length > 0 ? user[0].motto : '';
        let countryCode = user.length > 0 ? user[0].countryCode : '';

        let fResults = await FortunaHistoryModel.aggregate([
            {
                $match: { telegramId: telegramId + '' }
            },
            {
                $group:
                    {
                        _id: "$telegramId",
                        totalPoints: { $sum: "$fortuna_point" }
                    }
            }
        ]);

        let totalFortuna = fResults.length > 0 ? fResults[0].totalPoints : 0;

        let skills = await SkillModel.find({}).lean().exec();

        let skillHistories = await SkillHistoryModel.aggregate([
            {
                $match: { telegramId: telegramId + '' }
            },
            {
                $group:
                    {
                        _id: "$skill",
                        totalPoints: { $sum: "$score" }
                    }
            }
        ]);
        let mySkills = {};
        for (let i = 0; i < skills.length; i ++) {
            mySkills[skills[i].name] = 0;
            for (let j = 0; j < skillHistories.length; j ++) {
                if (skillHistories[j]._id == skills[i].name) {
                    mySkills[skills[i].name] = (skillHistories[j].totalPoints * 1).toFixed(1)
                }
            }
        }

        let missions = await MissionHistoryModel.find({telegramId: telegramId}).populate('mission').lean().exec();

        console.log('get-profile-data-finished:', new Date());

        return {joinDate, result, sessionCount, rank, teleUser, rResult, motto, totalFortuna, myParts, countryCode, skills, mySkills, missions, totalPoint};
    }
};
