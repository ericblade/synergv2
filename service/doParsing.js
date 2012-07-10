var	xml2js = require('xml2js');
var fs = require('fs');

var parser = new xml2js.Parser();
var body = fs.readFileSync('./parserinput.txt');
parser.parseString(body,
    function(err,xml){
        fs.writeFileSync('./parseroutput.txt', JSON.stringify(xml));
    });

