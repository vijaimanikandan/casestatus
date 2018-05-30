const rus = require('req-uscis-status');
const http = require('http');
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

getStatus = async (caseNum) => {
    return new Promise((resolve, reject) => {
        rus.getStatus(caseNum, async (err, statusObject) => {
            if (err) {
                console.error(err);
                reject();
            }
            console.warn(`Processed ${caseNum}`);
            // console.log(statusObject);
            // if (statusObject['statusLongText'].includes("I-765") || statusObject['statusLongText'].includes("ordered your new card") || statusObject['statusLongText'].includes("Card Was Delivered")) {
            if (statusObject['statusLongText'].includes("I-765") || statusObject['statusLongText'].includes("ordered your new card") || statusObject['statusLongText'].includes("Card Was Delivered")) {
                console.info("Success");
                console.log(statusObject);
                // statusObject.statusLongHtml = "";
                // statusObject.statusLongText = "";
                // statusObject.statusShortHtml = "";
                // statusObject.statusShortText = "";
            }
            await caseModel.deleteMany({caseNumber:caseNum}).exec();
            var caseObj = await caseModel.create({
                caseNumber: caseNum,
                statusLongHtml: statusObject.statusLongHtml,
                statusLongText: statusObject.statusLongText,
                statusShortHtml: statusObject.statusShortHtml,
                statusShortText: statusObject.statusShortText
            });
            // }
            resolve();
        });
    });
};

// stream.write("{");
main = async () => {

    var prefix = "WAC18901";
    var startNum = 35000;
    var endNum = 40000;
    var arr = []
    while (arr.length < 100) {
        var randomnumber = Math.floor(Math.random() * (endNum - startNum)) + 1;
        randomnumber = pad(startNum + randomnumber, 5);
        let caseCount = (await caseModel.find({ caseNumber: prefix + randomnumber }).limit(1).count());
        if (caseCount > 0) {
            console.log(`${prefix + randomnumber} present in Case List. Continuing...`);
            continue;
        }
        arr[arr.length] = randomnumber;
    }
    console.log(arr);
    for (i = 0; i < arr.length; i++) {
        await sleep(100);
        caseNum = prefix + arr[i];
        try { await getStatus(caseNum); } catch (e) { console.error(e); }
    };
    mongoose.disconnect();
    console.log("Finished");
};

main();
