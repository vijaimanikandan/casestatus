const rus = require('req-uscis-status');
const fs = require('fs');
const http = require('http');

var caseNumList = [];
var stream = fs.createWriteStream("./caseList.txt", { flags: 'a' });
var listStream = fs.createWriteStream("./processedCaseList.txt", { flags: 'a' });
var caseList = {};
var prefix = "WAC18901";
// var startNum = 30988;
// var endNum = 59529;
var startNum = 30000;
var endNum = 31000;

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
        rus.getStatus(caseNum, (err, statusObject) => {
            if (err) {
                console.error(err);
                reject();
            }
            if (statusObject['statusLongText'].includes("I-765") || statusObject['statusLongText'].includes("ordered your new card") || statusObject['statusLongText'].includes("Card Was Delivered")) {
                caseList[caseNum] = statusObject;
                console.log(caseList[caseNum]);
                stream.write('"' + caseNum + '" : \n' + JSON.stringify(caseList[caseNum]) + ",\n");
            }
            resolve();
        });
    });
};

// stream.write("{");
main = async () => {
    var arr = []
    while (arr.length < 100) {
        var fileContent = fs.readFileSync("./processedCaseList.txt");
        var randomnumber = Math.floor(Math.random() * (endNum - startNum)) + 1;
        randomnumber = pad(randomnumber, 5)
        if (arr.indexOf(randomnumber) > -1 || fileContent.includes(prefix + randomnumber)) {
            console.log(`${prefix + randomnumber} present at ${arr.indexOf(randomnumber)}. Continuing...`);
            continue;
        }
        arr[arr.length] = randomnumber;
    }
    for (i = 0; i < arr.length; i++) {
        await sleep(100);
        caseNum = prefix + (startNum + (Number(arr[i]) - 1));
        console.log(`Processing ${caseNum}`);
        listStream.write(caseNum + "\n");
        await getStatus(caseNum);
    };
    // stream.write("}");
    stream.end();
    console.log("Finished");
};

main();
