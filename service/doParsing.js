//var	xml2js = require('xml2js');
var fs = require('fs');

//var parser = new xml2js.Parser();
var body = String(fs.readFileSync('/tmp/synergvtemp/parserinput'+ process.argv[2] + '.txt'));
/*parser.parseString(body,
    function(err,xml){
        fs.writeFileSync('./parseroutput.txt', JSON.stringify(xml));
    });
*/
console.log(typeof body);
var i = body.indexOf("<![CDATA[{") + "<![CDATA[".length;
var j = body.indexOf("}]]>", i) + 1;

var k = body.indexOf("<![CDATA[", j) + "<![CDATA[ ".length;
var l = body.indexOf("</div> ]]>", k) + "</div>".length;

console.log("i " + i + " j " + j + " k " + k + " l " + l)
var x = { json: body.substring(i, j), html: body.substring(k, l) };
fs.writeFileSync('/tmp/synergvtemp/parseroutput'+process.argv[2]+'.txt', JSON.stringify(x));