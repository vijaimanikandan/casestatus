const rus = require('req-uscis-status');
const fs = require('fs');

var caseNumList = [];
var stream = fs.createWriteStream("./caseList.txt", { flags: 'a' });
var caseList = {};
var prefix = "WAC18901";
var startNum = 30988;
var endNum = 59529;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

getStatus = async (caseNum) => {
    return new Promise((resolve, reject) => {
        rus.getStatus(caseNum, (err, statusObject) => {
            if (err) {
                console.error(err);
                reject();
            }
            caseList[caseNum] = statusObject;
            console.log(caseList[caseNum]);
            stream.write('"' + caseNum + '" : \n' + JSON.stringify(caseList[caseNum]) + ",\n");
            resolve();
        });
    });
};

stream.write("{");
main = async () => {
    for (let i = 1; i <= (endNum - startNum); i++) {
        await sleep(1000);
        caseNum = prefix + (startNum + i - 1);
        console.log(`Processing ${caseNum}`);
        await getStatus(caseNum);
    };
    stream.write("}");
    stream.end();
};

main();
