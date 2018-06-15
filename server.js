const express = require('express');
const rus = require('req-uscis-status');
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

var receivedCaseModel = mongoose.model('ReceivedCase',
    new mongoose.Schema(
        {
            timestamp: { type: Date, default: Date.now },
            caseNumber: String,
            errHtml: String,
            statusShortHtml: String,
            statusShortText: String,
            statusLongHtml: String,
            statusLongText: String
        }
    )
);

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

getReceivedCases = async () => {
    var receivedCaseNums = ["30698", "31743", "31924", "32000", "32130", "32799", "32919", "33029", "33161", "33237", "33688", "33694", "33891", "34137", "34138", "34166", "34167", "34168", "34288", "34503", "35081", "35376", "35932", "35965", "36281", "36809", "37712", "37872", "38060", "38924", "40943", "42188", "44855", "45488", "45595", "45991", "45993", "46226", "47805", "49708", "50876", "50998", "51957", "52612", "53582", "53956", "55333", "55872", "56581", "57464", "57512", "58156", "58296", "59436", "59527", "59529", "59531", "59533", "59538", "59813", "59833", "59881", "59885"];
    // var receivedCaseNums = ["30698", "31743", "31924"];
    var prefix = "WAC18901";
    var promises = receivedCaseNums.map(async (receivedCaseNum, index, array) => {
        receivedCaseNum = prefix + receivedCaseNum;
        return new Promise((resolve, reject) => {
            rus.getStatus(receivedCaseNum, async (err, statusObject) => {
                if (err) {
                    console.error(err);
                    reject();
                }
                console.warn(`Processed ${receivedCaseNum}`);
                await receivedCaseModel.create({
                    caseNumber: receivedCaseNum,
                    statusLongHtml: statusObject.statusLongHtml,
                    statusLongText: statusObject.statusLongText,
                    statusShortHtml: statusObject.statusShortHtml,
                    statusShortText: statusObject.statusShortText
                });
                resolve();
            });
        });
    });
    // console.log(promises);
    return Promise.all(promises);
};

app.get("/", async (req, res) => {
    await getReceivedCases();
    await receivedCaseModel.aggregate([
        {
            $sort:
            {
                caseNumber: 1, updatedDate: -1
            }
        },
        {
            $group:
                {
                    _id:
                        {
                            caseNumber: "$caseNumber",
                            updatedDate: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "America/Los_Angeles" } }
                        },
                    "doc": { "$last": "$$ROOT" }
                }
        },
        { "$replaceRoot": { "newRoot": "$doc" } },
        { "$out": "receivedcases" }
    ]);
    console.log('Got Cases');
    var response = `<html>
    <head>
    <title>Received Cases</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.16/css/jquery.dataTables.min.css">
    <body>
    <div class="container-fluid">
        <nav class="navbar navbar-inverse">
            <div class="container-fluid">
                <div class="navbar-header">
                <a class="navbar-brand" href="#">Received Cases</a>
                </div>
                <ul class="nav navbar-nav">
                    <li class="active"><a href="#">Home</a></li>
                    <li><a href="/full">All Cases</a></li>
                    <li><a id="show-latest" href="#">Show Latest</a></li>
                </ul>
            </div>
        </nav>
    </div>
    </div>
    <div class="container-fluid table-responsive">
    <table id="casesTable" class="table table-hover"><thead><tr><th>Case Number</th><th>Case Status</th></tr></thead><tbody>`;
    var findPromise = new Promise((resolve, reject) => {
        receivedCaseModel.find({}, async function (err, cases) {
            console.log("Got Records");
            cases.sort((a, b) => {
                // return a.caseNumber.localeCompare(b.caseNumber);
                return a.timestamp.getTime() - b.timestamp.getTime();
            });
            // cases.filter((caseObj, index, array) => {
            //     return (
            //         true
            //         // caseObj['statusLongText'].includes("I-765") || caseObj['statusLongText'].includes("ordered your new card")
            //         // || (caseObj['statusLongText'].includes("Card Was Delivered") && !(caseObj['statusLongText'].includes("March") || caseObj['statusLongText'].includes("April")))
            //     );
            // });
            receivedCases = await cases.reduce(async (previousPromise, currentValue, currentIndex, array) => {
                accumulator = await previousPromise;
                var dateString = currentValue['timestamp'].getFullYear() + "-" + (pad(currentValue['timestamp'].getMonth() + 1, 2)) + "-" + pad(currentValue['timestamp'].getDate(), 2)
                    + " " + pad(currentValue['timestamp'].getHours(), 2) + ":" + pad(currentValue['timestamp'].getMinutes(), 2) + ":" + pad(currentValue['timestamp'].getSeconds(), 2);
                if (currentValue['caseNumber'] in accumulator) {
                    if (currentValue['statusShortText'].match(/Case Was Received/i))
                        accumulator[currentValue['caseNumber']] += ('<div class="panel-group"><div class="panel panel-default">' + (`<div class="panel-heading"><span class="badge">` + dateString + '</span>') + ' <span class="glyphicon glyphicon-star"></span> ' + `<a data-toggle="collapse" href="#${currentValue['caseNumber'] + dateString.replace(/\s+/g, "").replace(/-+/g, "").replace(/:+/g, "")}">` + currentValue['statusShortText'] + `</a></div> <div id="${currentValue['caseNumber'] + dateString.replace(/\s+/g, "").replace(/-+/g, "").replace(/:+/g, "")}" class="panel-collapse collapse"><div class="panel-body">` + currentValue['statusLongText'] + '</div></div></div></div>');
                    else
                        accumulator[currentValue['caseNumber']] += ('<div class="panel-group"><div class="panel panel-info">' + (`<div class="panel-heading"><span class="badge">` + dateString + '</span>') + ' <span class="glyphicon glyphicon-star-empty"></span> ' + `<a data-toggle="collapse" href="#${currentValue['caseNumber'] + dateString.replace(/\s+/g, "").replace(/-+/g, "").replace(/:+/g, "")}">` + currentValue['statusShortText'] + `</a></div> <div id="${currentValue['caseNumber'] + dateString.replace(/\s+/g, "").replace(/-+/g, "").replace(/:+/g, "")}" class="panel-collapse collapse"><div class="panel-body">` + currentValue['statusLongText'] + '</div></div></div></div>');
                } else {
                    accumulator[currentValue['caseNumber']] = ((`<div class="panel-group"><div class="panel panel-primary"><div class="panel-heading"><span class="badge">` + dateString + '</span>') + ' <span class="glyphicon glyphicon-home"></span> ' + `<a style="color:white" data-toggle="collapse" href="#${currentValue['caseNumber'] + dateString.replace(/\s+/g, "").replace(/-+/g, "").replace(/:+/g, "")}">` + currentValue['statusShortText'] + `</a></div> <div id="${currentValue['caseNumber'] + dateString.replace(/\s+/g, "").replace(/-+/g, "").replace(/:+/g, "")}" class="panel-collapse collapse"><div class="panel-body">` + currentValue['statusLongText'] + '</div></div></div></div>');
                }
                return accumulator;
            }, Promise.resolve({}));
            console.log("Reduced");
            promises = Object.keys(receivedCases).map(async function (key, index, array) {
                caseNumberBadge = `<button class="btn btn-primary" type="button">${key} <span class="badge">${receivedCases[key].split(`<div class="panel `).length - 1}</span></button>`
                response += `<tr><td style="vertical-align: top;text-align:center">${caseNumberBadge}</td><td class="case-history">${receivedCases[key]}</td></tr>`
            });
            await Promise.all(promises);
            console.log('Response Constructed');
            response += `</tbody></table></div>
            <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
            <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
            <script src="https://cdn.datatables.net/1.10.16/js/jquery.dataTables.min.js"></script>`
            response += `<script>
                $(document).ready(function() {
                    $('#casesTable').DataTable({
                        "displayLength":100
                    });
                    $("#show-latest").click((e) => {
                        var menuText = $(e.target).text();
                        $(e.target).text(menuText=="Show Latest"?"Show All":"Show Latest");
                        $(".case-history").each((i, value) => {
                            $(value).find(".panel:not(:first):not(:last)").each((j, p) => {
                                $(p).toggle();
                            });
                        });
                    });
                });
            </script>`;
            response += `</body></html>`;
            resolve();
        });
    });
    await findPromise;
    console.log('Sending Response');
    res.send(response);
});

app.get("/full", (req, res) => {
    var response = `<html>
    <head>
    <title>Cases</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.16/css/jquery.dataTables.min.css">
    <body>
    <div class="container-fluid">
        <nav class="navbar navbar-inverse">
            <div class="container-fluid">
                <div class="navbar-header">
                <a class="navbar-brand" href="#">All Cases</a>
                </div>
                <ul class="nav navbar-nav">
                    <li><a href="-">Home</a></li>
                    <li class="active"><a href="/full">All Cases</a></li>
                </ul>
            </div>
        </nav>
    </div>
    <div class="container-fluid table-responsive">
    <table id="casesTable" class="table table-hover"><thead><tr><th>No</th><th>Case Number</th><th>Status</th><th>Description</th></tr></thead><tbody>`;
    caseModel.find({}, function (err, cases) {
        cases.sort((a, b) => {
            return a.caseNumber.localeCompare(b.caseNumber);
        });
        cases
            .filter((caseObj, index, array) => {
                return (
                    // true
                    caseObj['statusLongText'].includes("I-765") || caseObj['statusLongText'].includes("ordered your new card")
                    || (caseObj['statusLongText'].includes("Card Was Delivered") && !(caseObj['statusLongText'].includes("March") || caseObj['statusLongText'].includes("April")))
                );
            })
            .forEach(function (caseObj, index, array) {
                response += `<tr><td>${index + 1}</td><td>${caseObj.caseNumber}</td><td>${(caseObj.statusShortText.split(":")[1]).trim()}</td><td>${caseObj.statusLongText}</td></tr>`
            });
        response += `</tbody></table></div>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
        <script src="https://cdn.datatables.net/1.10.16/js/jquery.dataTables.min.js"></script>`
        response += `<script>
            $(document).ready(function() {
                $('#casesTable').DataTable({
                    "displayLength":25
                });
            });
        </script>`;
        // response += `<script>
        // $(document).ready(function() {
        //     var groupColumn = 2;
        //     var table = $('#casesTable').DataTable({
        //         "columnDefs": [
        //             { "visible": false, "targets": groupColumn }
        //         ],
        //         "order": [[ groupColumn, 'asc' ]],
        //         "displayLength": 25,
        //         "drawCallback": function ( settings ) {
        //             var api = this.api();
        //             var rows = api.rows( {page:'current'} ).nodes();
        //             var last=null;

        //             api.column(groupColumn, {page:'current'} ).data().each( function ( group, i ) {
        //                 if ( last !== group ) {
        //                     $(rows).eq( i ).before(
        //                         '<tr class="group"><td colspan="3">'+group+'</td></tr>'
        //                     );

        //                     last = group;
        //                 }
        //             } );
        //         }
        //     } );

        //     // Order by the grouping
        //     $('#casesTable tbody').on( 'click', 'tr.group', function () {
        //         var currentOrder = table.order()[0];
        //         if ( currentOrder[0] === groupColumn && currentOrder[1] === 'asc' ) {
        //             table.order( [ groupColumn, 'desc' ] ).draw();
        //         }
        //         else {
        //             table.order( [ groupColumn, 'asc' ] ).draw();
        //         }
        //     } );
        // } );
        // </script>`;
        response += `</body></html>`;
        res.send(response);
    });
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
