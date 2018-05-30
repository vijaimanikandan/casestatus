const express = require('express');
var app = express();
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/casestatus').then(
    () => { console.log('DB Connected'); },
    (err) => { console.log('DB Connection Error' + err); }
);
var caseModel = mongoose.model('Case',
    new mongoose.Schema(
        {
            caseNumber: String,
            errHtml: String,
            statusShortHtml: String,
            statusShortText: String,
            statusLongHtml: String,
            statusLongText: String
        }
    )
);

app.get("/", (req, res) => {
    var response = `<html>
    <head>
    <title>Cases</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
    <body>
    <div class="table-responsive">
    <table class="table table-striped table-hover"><thead><tr><th>No</th><th>Case Number</th><th>Status</th><th>Description</th></tr></thead><tbody>`;
    caseModel.find({}, function (err, cases) {
        cases.sort((a, b) => {
            return a.caseNumber.localeCompare(b.caseNumber);
        });
        cases
        .filter((caseObj, index, array) => {
            return (
                caseObj['statusLongText'].includes("I-765") || caseObj['statusLongText'].includes("ordered your new card") ||
                (caseObj['statusLongText'].includes("Card Was Delivered") && !(caseObj['statusLongText'].includes("March") || caseObj['statusLongText'].includes("April")))
            );
        })
        .forEach(function (caseObj, index, array) {
            response += `<tr><td>${index + 1}</td><td>${caseObj.caseNumber}</td><td>${(caseObj.statusShortText.split(":")[1]).trim()}</td><td>${caseObj.statusLongText}</td></tr>`
        });
        response += "</tbody></table></div></body></html>";
        res.send(response);
    });
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
