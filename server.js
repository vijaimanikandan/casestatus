const fs = require('fs');
const express = require('express');

var app = express();


app.get("/", (req, res) => {
    var fileContent = fs.readFileSync("./caseList.txt", "utf8")
    fileContent = fileContent.replace(/,\s*$/, "");
    caseMap = JSON.parse(`{${fileContent}}`);

    var caseList = Object.keys(caseMap).sort().map((element, index, array) => {
        caseMap[element]["caseNum"] = element;
        return caseMap[element];
    });

    var response = "<table><thead><tr><th>S No</th><th>Case Number</th><th>statusShortText</th><th>statusLongText</th></tr></thead><tbody>";
    caseList.forEach((element, index, array) => {
        response += `<tr><td>${index}</td><td>${element.caseNum}</td><td>${element.statusShortText.split(":")[1]}</td><td>${element.statusLongText}</td></tr>`
    });
    response += "</tbody></table>";
    res.send(response);
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});
