const TitleModel = require('../models/studentTitle');
const StudentResultModel = require('../models/studentResult');

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
        const res = await StudentResultModel.find().sort({session_no: - 1});
        let pupilsInfo = [];

        for (const stuRes of res) {
            const filteredId = pupilsInfo.findIndex((item) => item.telegramId === stuRes.telegramId );
            if (filteredId < 0) {
                pupilsInfo.push(stuRes);
            }
        }

        return pupilsInfo;
    }
};
