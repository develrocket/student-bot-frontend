const express = require('express');
const path = require('path');
const router = express.Router();

const ResultModel = require('../../models/studentResult');
const SessionModel = require('../../models/sessionResult');
const TitleModel = require('../../models/studentTitle');
const Utils = require('../../helpers/utils');
const axios = require('axios').default;

const fetchSession = async function() {
    let sessions = await SessionModel.find().sort({session_no: -1}).limit(1);
    let lastId = sessions[0].session_no;
    try {
        let res = await axios.get('https://fortunaenglish.com/api/fetch/livesession?lastId=' + lastId);

        for (const sessionItem of res.data) {
            const newSessionItem = new SessionModel();
            newSessionItem.language = sessionItem.language;
            newSessionItem.session_type = sessionItem.type;
            newSessionItem.session_name = sessionItem.session_name;
            newSessionItem.session_no = sessionItem.id;
            newSessionItem.session_start = sessionItem.start_time;
            newSessionItem.questions_no = sessionItem.questions;
            await newSessionItem.save();
        }
        console.log('insert-new-session:', res.data.length);
    } catch (err) {
        console.log(err);
    }
}

const reader = require('xlsx');
const excel_file = __dirname + "/Situation.xlsx";

module.exports = function() {
    return {
        importExcel: async function (req, res) {
            const sessionResults = [];
            const studentsResults = [];
            const studentInfo = [];
            let temp = null;

            try {
                const file = reader.readFile(excel_file);

                temp = reader.utils.sheet_to_json(file.Sheets["students_results"]);
                const isDuplicate = await ResultModel.findOne({telegramId: temp[0]["Telegram ID"], session_no: res["Session_no"]});

                if (isDuplicate) {
                    return res.json({state: "failed", data: "already exist!"});
                }

                temp = reader.utils.sheet_to_json(file.Sheets["student_titles"]);
                const res0 = await TitleModel.insertMany(temp);

                temp = reader.utils.sheet_to_json(file.Sheets["session_results"]);
                // eslint-disable-next-line no-shadow
                temp.forEach((res) => {
                    sessionResults.push({
                        no: res["ID"],
                        language: res["Language"],
                        session_type: res["Session_type"],
                        session_name: res["Session_name"],
                        session_no: res["Session_no"],
                        session_start: Utils.excelDateToJSDate(res["Session_start"]),
                        questions_no: res["Questions_no"],
                        students_no: res["Students_no"],
                    });
                });

                const res1 = await SessionModel.insertMany(sessionResults);

                temp = reader.utils.sheet_to_json(file.Sheets["students_results"]);

                temp.sort((a, b) => a["Session_no"] - b["Session_no"]);

                // eslint-disable-next-line no-shadow
                for (const res of temp) {
                    const session = await SessionModel.findOne({session_no: res["Session_no"]});

                    const filteredId = studentInfo.findIndex((item) => item.tel_id === (res["Telegram ID"] * 1));
                    let title = "";
                    let totalFortuna = 0;
                    let sumPoint = 0;
                    if (filteredId < 0) {
                        studentInfo.push({tel_id: res["Telegram ID"], sumPoint: res["Session_points"], sumFortuna: res["Fortuna_points"]});
                        totalFortuna = res["Fortuna_points"];
                        sumPoint = res["Session_points"];
                        title = await Utils.getTitle(res["Session_points"] * 1);
                    } else {
                        studentInfo[filteredId].sumPoint += res["Session_points"];
                        studentInfo[filteredId].sumFortuna += res["Fortuna_points"];
                        sumPoint = studentInfo[filteredId].sumPoint;
                        totalFortuna = studentInfo[filteredId].sumFortuna;
                        title = await Utils.getTitle(studentInfo[filteredId].sumPoint);
                    }

                    studentsResults.push({
                        no: res["ID"],
                        username: res["Username"],
                        telegramId: res["Telegram ID"],
                        session: session._id,
                        session_no: res["Session_no"],
                        session_points: res["Session_points"],
                        session_rank: res["Session_rank"],
                        fortuna_points: res["Fortuna_points"],
                        title: title,
                        sum_point: sumPoint,
                        total_fortuna_user: totalFortuna,
                    });
                }

                const res2 = await ResultModel.insertMany(studentsResults);
            } catch (e) {
                console.log(e);
                return res.json({state: "failed", data: "server error"});
            }

            return res.json({state: "success"});
        },

        getStudentResult: async function (req, res) {
            await fetchSession();

            const stuResults = req.body.data;
            const pupilsInfo = await Utils.getPupilsInfo();
            let createdCount = 0;

            stuResults.sort((a, b) => a.session_no - b.session_no * 1);

            for (const stuResult of stuResults) {
                const filteredStu = await ResultModel.find({telegramId: stuResult.telegramId, session_no: stuResult.session_no});
                if (filteredStu.length === 0) {
                    const session = await SessionModel.findOne({session_no: stuResult.session_no});
                    if (session) {
                        const lastestData = pupilsInfo.find((item) => item.telegramId == stuResult.telegramId);
                        const sumPoint = lastestData.sum_point + stuResult.session_points*1;
                        const sumFortuna = lastestData.total_fortuna_user + stuResult.session_rank*0.1;
                        const title = await Utils.getTitle(sumPoint);
                        createdCount++;

                        const newRes = new ResultModel({
                            username: stuResult.username,
                            telegramId: stuResult.telegramId,
                            session: session._id,
                            session_no: stuResult.session_no,
                            session_points: stuResult.session_points,
                            session_rank: stuResult.session_rank,
                            fortuna_points: stuResult.session_rank * 0.1,
                            title: title,
                            sum_point: sumPoint,
                            total_fortuna_user: sumFortuna,
                        });
                        newRes.save();

                    }
                }
            }

            return res.json({state: "success", data: `${createdCount} rows created successfully`});
        },

        getSessionData: async function (req, res) {
            const sessionData = req.body.sessionData;
            const totalData = await SessionModel.find();
            let addedCount = 0;

            for (const sessionItem of sessionData) {
                if (!totalData.find((item) => item.session_no == sessionItem.session_no)) {
                    addedCount ++;
                    const newSessionItem = new SessionModel();
                    newSessionItem.language = sessionItem.language;
                    newSessionItem.session_type = sessionItem.session_type;
                    newSessionItem.session_name = sessionItem.session_name;
                    newSessionItem.session_no = sessionItem.session_no;
                    newSessionItem.session_start = sessionItem.session_started;
                    newSessionItem.questions_no = sessionItem.questions_no;
                    const result = await newSessionItem.save();
                    totalData.push(result);
                }
            }

            return res.json({state: "success", data: `${addedCount} rows created successfully.`});
        }
    }
};
