/**
 * ============================
 * Covid2019.CH.map
 * ============================
 */
// Create 
const fs = require('fs')
const puppeteer = require('puppeteer')
const express = require('express');
const app = express();
const path = require('path');
const _ = require('lodash');
const request = require('request');
const util = require('util')
const Twitter = require('twitter');
const Papa = require('papaparse')
const got = require('got');
/** App Configs */
App = {}
/**  */
App.isProduction = false;
/** */
App.PORT = 3033;
App.URL = 'http://localhost:' + App.PORT;
App.post = "";
App.DataSrcURL = "https://raw.githubusercontent.com/daenuprobst/covid19-cases-switzerland/master/covid19_cases_switzerland.csv"
App.DataSrcFataURL = "https://raw.githubusercontent.com/daenuprobst/covid19-cases-switzerland/master/covid19_fatalities_switzerland.csv"
App.DataSrcJSON = null;
App.day = "";
App.dataUpdated = 0;
var jsonData;
require('dotenv').config();
/** */
if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET || !process.env.TWITTER_CONSUMER_TOKEN_KEY || !process.env.TWITTER_CONSUMER_TOKEN_SECRET) {
  console.log("ERROR: Twitter keys and tokens are not set")
  return
} else {
  console.log("Key: ", process.env.TWITTER_CONSUMER_KEY)
  console.log("KeySecret: ", process.env.TWITTER_CONSUMER_SECRET)
  console.log("Token: ", process.env.TWITTER_CONSUMER_TOKEN_KEY)
  console.log("TokenSecret: ", process.env.TWITTER_CONSUMER_TOKEN_SECRET)
}
/** */
var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_CONSUMER_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_CONSUMER_TOKEN_SECRET
});
/** Express */
app.use(express.static('.'))
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});
app.listen(App.PORT);
/** Reading the Remote Data */
console.log("Example app listening at", App.URL)
/** */
if (App.isProduction) {
  console.log('Production Mode')
} else {
  console.log('Development Mode')
}
/** Reading Source file*/

/** */

(async () => {
  try {
    var response = await got(App.DataSrcURL);
    console.log('swissData',JSON.stringify(response.body));
    var swissData = Papa.parse(response.body,{header:true})
    var recentData = getRecent(swissData)
    console.log('swissData: Reading Success',recentData);
    await updateData(recentData)
    var response = await got(App.DataSrcFataURL);
    // console.log('swissFata: ',JSON.stringify(response.body));
    var swissFata = Papa.parse(response.body,{header:true})    
    var recentFata = getRecent(swissFata)
    console.log('swissFata: Reading Success',recentFata);
    await updateData(recentFata, "fata")
    await generatePng()
    if (App.isProduction) {
      setTimeout(() => {
         createTweet()
      }, 1000)
      console.log('Terminating the script')
      exit()
    }   
  } catch (error) {
    console.log('Building map Error', error);
  }
})();
/** Get the most recent updates */
function getRecent(data){
  var json = _.filter(data.data, function (o) {
    if (o.AG) {
      return o
    }
  });
  console.log("Getting Recent Data", json[json.length - 1])
  var latest = json[json.length - 1];
  latest.day = latest[Object.keys(latest)[0]]
  return latest
}
/** Update the Data file */
function updateData(latest,type) {
  if(App.dataUpdated == 0){
    var buffer = fs.readFileSync("swiss.src.json");
    var data = JSON.parse(buffer)
    App.data = data;
  }
  console.log('Reading Cantons: ', App.data.objects.cantons.geometries.length)
  var cantons = App.data.objects.cantons.geometries
  App.data.day = latest.day
  if(type == 'fata'){
    console.log('Total Fatailities Updated :', latest.CH)
    App.data.fataTotal = latest.CH
  }else{
    console.log('Total Cases Updated :', latest.CH)
    App.data.total = latest.CH
  }
  var cantonsUpdate = _.map(cantons, (element) => {
    var props = {
      properties: {
        id: element.id,
        name: element.properties.name,
      }
    }
   
    if(type == 'fata'){
      
      props.properties.fata = latest[element.id] || 0
      props.properties.cases = element.properties.cases;
     
      console.log('\x1b[36m', props.properties.name ,'\x1b[0m');
      console.log('=')
      console.log(props.properties)
      console.log('-----------------------------')
    }else{
      props.properties.cases = latest[element.id] || 0;
    }
    return _.extend({}, element, props );
  })
  App.data.objects.cantons.geometries = cantonsUpdate
  console.log("Success", "Cantons data updated")
  /**Writing new Data */
  // Validate if both data are updated 
  App.dataUpdated = App.dataUpdated + 1
  console.log("App.dataUpdated", App.dataUpdated)
  // Writing the file
  fs.writeFile('./swiss.json', JSON.stringify(App.data), 'utf8', function (err) {
    if (err) {
      return console.log(err);
    } else {
      console.log("Writing Mew Data Success")
    }
  });
}
/** Generate PNG Image */
function generatePng() {
  (async () => {
    console.log('Taking A Screenshot')
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 960,
      height: 760,
      deviceScaleFactor: 1,
    });
    await page.goto(App.URL);
    await page.screenshot({
      path: 'swiss.png'
    });
    console.log('Screenshot is ready at "swiss.png"')
    await browser.close();
  })();
}
/** Csv to JSON */
function csvToJson(csv) {
  const content = csv.split('\n');
  const header = content[0].split(',');
  var c = _.tail(content).map((row) => {
    return _.zipObject(header, row.split(','));
    console.log(c)
  });
}
/**Create Tweet and Publish to Twitter */
function createTweet() {
  var image = require('fs').readFileSync('swiss.png');
  console.log("Reading Image", image)
  client.post('media/upload', {
    media: image
  }, function (error, media, response) {
    if (!error) {
      console.log("Uploading the Image file");
      console.log(media);
      console.log("Success: Image file uploaded");
      var status = {
        status: 'Look at your CT Scan images with Miele-LXIV, free and OpenSource https://apps.apple.com/de/app/miele-lxiv/id988332475?mt=12 #Covid19 #DICOM Switzerland still transmits test results via Fax ;( so lots of data is missing. Map generated with https://github.com/zdavatz/covid2019_ch_map - data from here https://github.com/daenuprobst/covid19-cases-switzerland/blob/master/covid19_cases_switzerland.csv',
        media_ids: media.media_id_string
      }
      client.post('statuses/update', status, function (error, post, response) {
        if (!error) {
          console.log("Success", "The Tweet has been posted to Twitter", post.id_str);
          console.log("Tweet", "https://twitter.com/" + post.user.screen_name + '/status/' + post.id_str)
          
        }
      });
    } else {
      console.log("Twitter upload error", error)
    }
  });
}
/**exit */
function exit() {
  process.kill(process.pid);
}
/** */
function csvParse(data){
  if(!data){
    throw Error('No-data',"csvParse: Please submit the data")
    return 
  }
  var data = JSON.parse(data)
  var json = Papa.parse(data,{header:true})
  return json
}
/** */
