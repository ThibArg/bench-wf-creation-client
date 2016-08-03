/* To be used with node.js.
bench-wf-creation.js

IMPORTANT: You must have a config-localhost.json at same level of this script.
Example of such configuration file:

{
  "baseUrl": "http://localhost:8080/nuxeo/",
  "login": "Administrator",
  "password": "Administrator",

  "domainPath": "/default-domain",

  "nbFileCreate": 100,
  "sleepMs": 50
}
*/
var Nuxeo = require('nuxeo'),
	//http = require('http'),
    //fs = require('fs'),
    //path = require('path'),
    gConfig, gConnectToNuxeo, gImportFolderId,
    gCount, gMessageSuffix,
    importFolder, folderTitle;
// Read from gConfig
var DOMAIN_PATH, NB_TO_CREATE, SLEEP_MS;

// Read misc.infos (nb of doc. to create, interval, login/pwd...) form the configuration
console.log("Reading configuration");
gConfig = require('./config-localhost.json');
// Get test values
DOMAIN_PATH = gConfig.domainPath;
NB_TO_CREATE = gConfig.nbFileCreate;
SLEEP_MS = gConfig.sleepMs;

// Error check
if(typeof NB_TO_CREATE !== "number" || NB_TO_CREATE < 1) {
	console.error("Invalid number of documents to create: " + NB_TO_CREATE);
	return;
}
if(typeof SLEEP_MS !== "number" || SLEEP_MS < 0) {
	console.error("Invalid sleep time: " + SLEEP_MS);
	return;
}

// Create the client
gConnectToNuxeo = new Nuxeo({
  baseURL: gConfig.baseUrl,
  auth: {
    method: 'basic',
    username: gConfig.login,
    password: gConfig.password
  }
});

// Create an import folder at domain level
console.log("Creating the import folder at " + DOMAIN_PATH + "...");
folderTitle = "" + (new Date()).toISOString().substring(0, 19) + "-" + NB_TO_CREATE + "-" + SLEEP_MS;
importFolder = {
	"entity-type": "document",
	"name": folderTitle,
	type: "Folder",
	properties: {
		"dc:title": folderTitle
	}
}

gConnectToNuxeo.repository()
	.create(DOMAIN_PATH, importFolder)
	.then(function(doc) {
		console.log("Import folder created: " + doc.title);
		gImportFolderId = doc.uid;
		createAllDocs();
	})
	.catch(function(error) {
		logError("Error creating the import folder", error);
	});


function createAllDocs() {

	// Just to avoid doing stupid useless things
	if(typeof gImportFolderId !== "string" || gImportFolderId === "") {
		console.error("No gImportFolderId");
		return;
	}

	console.log("Creating " + NB_TO_CREATE + " documents...");
	gCount = 0;
	gMessageSuffix = "/" + NB_TO_CREATE;
	createOneDoc();

}

// This function is pseudo recursive (call itself in the "then" callback)
function createOneDoc() {

	var title, newDoc;

	gCount += 1;
	title = "File-" + gCount;
	newDoc = {
		"entity-type": "document",
		"name": title,
		type: "File",
		properties: {
			"dc:title": title
		}
	}

	gConnectToNuxeo.repository()
		.create(gImportFolderId, newDoc)
		.then(function(doc) {
			console.log("Created: " + doc.title);
			if((gCount % 50) === 0) {
				console.log("Created: " + gCount + gMessageSuffix);
			}

			if(gCount >= NB_TO_CREATE) {
				endOfTest();
			} else {
				setTimeout(function() {
					createOneDoc();
				}, SLEEP_MS);
			}
		})
		.catch(function(error) {
			logError("Error creating the " + title + " document", error);
			endOfTest();
		});
}

function endOfTest() {
  	console.log("--------------------------------------------------");
	console.log("END OF TEST. Documents created: " + gCount + gMessageSuffix);
  	console.log("--------------------------------------------------");
}

function logError(msg, err) {
  console.log("==================================================");
  console.log(msg);
  console.log("==================================================");
  console.log(err);
}

//EOF