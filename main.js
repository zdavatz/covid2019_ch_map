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
const https = require('https');
const util = require('util')
const Twitter = require('twitter');
const Papa = require('papaparse')
const got = require('got');
const XLSX = require('xlsx')
const colors = require('colors')
var jsonData;
require('dotenv').config();
/** App Configs */
App = {}
/**  */
App.isProduction = true;
/** */
App.PORT = 3033;
App.URL = 'http://localhost:' + App.PORT;
App.post = "";
App.DataSrcURL = "https://raw.githubusercontent.com/daenuprobst/covid19-cases-switzerland/master/covid19_cases_switzerland.csv"
App.DataSrcFataURL = "https://raw.githubusercontent.com/daenuprobst/covid19-cases-switzerland/master/covid19_fatalities_switzerland.csv"
App.DataNew = "https://www.functor.xyz/covid_19/scrapers/outputs/latest.csv"
App.xlsFile = 'https://www.bag.admin.ch/dam/bag/de/dokumente/mt/k-und-i/aktuelle-ausbrueche-pandemien/2019-nCoV/covid-19-datengrundlage-lagebericht.xlsx.download.xlsx/200325_Datengrundlage_Grafiken_COVID-19-Bericht.xlsx'
App.xlsFile2 = 'https://www.bag.admin.ch/dam/bag/de/dokumente/mt/k-und-i/aktuelle-ausbrueche-pandemien/2019-nCoV/covid-19-datengrundlage-lagebericht.xlsx.download.xlsx/200325_Datengrundlage_Grafiken_COVID-19-Bericht.xlsx'


App.DataSrcJSON = null;
App.day = "";
App.dataUpdated = 0;
//
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
/**
 * 
 * Using Xlsx File
 */
function runXlxs() {
  // Used to write the file locally
  // request(App.xlsFile).pipe(fs.createWriteStream('data.xlsx'))
  request(App.xlsFile, {
    encoding: null
  }, function (err, res, data) {
    console.log('Checking remove exel file')
    console.log('Checking: ', App.xlsFile)
    if (err || res.statusCode !== 200) {
      throw new Error('XLSX file does not exist')
    };
    /* data is a node Buffer that can be passed to XLSX.read */
    var workbook = XLSX.read(data, {
      type: 'buffer'
    });
    var cantons = workbook.Sheets["COVID19 Kantone"]
    var sheet = XLSX.utils.sheet_to_json(cantons, {
      raw: true,
      header: ["canton", "cases"]
    })
    console.log('Sheet data [COVID19 Kantone]:')
    console.log(sheet)
    console.log('Cleaning data for the sheet')
    var xlxsData = _.map(sheet, (key, val) => {
      if (key.canton.length === 2) {
        // console.log('key',key.canton)
        return {
          canton: key.canton,
          cases: key.cases
        }
      }
    })
    var xlxsData = _.compact(xlxsData)
    console.log(xlxsData)
    updateDataXlsx(xlxsData)
    generatePng()
    publishTweet()
    /* DO SOMETHING WITH workbook HERE */
  });
}
runXlxs()
/**
 * Run  Updates for The New CSV
 */
function runUpdates() {
  var fileName = "data.csv"
  var file = fs.createWriteStream(fileName);
  https.get(App.DataNew, function (response, body) {
    response.pipe(file);
    response.on('end', () => {
      fs.readFile("data.csv", 'utf8', function (err, data) {
        console.log(data);
        var data = csvToJson(data)
        var data = _.filter(data, (o) => {
          if (o.date) {
            return o
          }
        })
        console.log('==========Data===========')
        console.log(data)
        updateDataNew(data)
        generatePng()
        console.log('Map Created')
        publishTweet()
      });
    })
  });
}


function publishTweet() {
  if (App.isProduction) {
    console.log('Publishing: mode')
    setTimeout(() => {
      createTweet()
    }, 2000)
  } else {
    console.log('Is Development mode... Debugging')
  }
}
/** Reading Source file*/
/** */
(async () => {
  try {
    console.log('Got Skipped')
    return
    var newData = await got(App.DataNew)
    var data = Papa.parse(newData.body, {
      header: true
    })
    var data = _.filter(data.data, (o) => {
      if (o.date) {
        return o
      }
    })
    console.log('==========Data===========')
    // console.log(data)
    // console.log('F',f)
    // return
    await updateDataNew(data)
    await generatePng()
    console.log("Example app listening at", App.URL)
    /**
     * canotons: abbreviation_canton_and_fl:
     * cases: ncumul_conf
     * deaths: ncumul_deceased
     *  */
    return
    //
    var response = await got(App.DataSrcURL);
    var swissData = Papa.parse(response.body, {
      header: true
    })
    var recentData = getRecent(swissData)
    console.log('Cases: Reading Success');
    console.dir(recentData, {
      depth: null,
      colors: true
    })
    await updateData(recentData)
    var response = await got(App.DataSrcFataURL);
    var swissFata = Papa.parse(response.body, {
      header: true
    })
    var recentFata = getRecent(swissFata)
    console.log('Fatalities: Reading Success');
    console.dir(recentFata, {
      depth: null,
      colors: true
    })
    await updateData(recentFata, "fata")
    await generatePng()
    if (App.isProduction) {
      console.log('Publishing: mode')
      createTweet()
    }
  } catch (error) {
    console.log('Building map Error', error);
  }
})();
/** Get the most recent updates */
function getRecent(data) {
  console.log(data)
  var json = _.filter(data.data, function (o) {
    if (o.CH) {
      return o
    }
  });
  console.log("Getting Recent Data")
  var latest = json[json.length - 1];
  latest.day = latest[Object.keys(latest)[0]]
  return latest
}
/**
 * 
 * Write Data to files 
 */
function writeFile(data) {
  fs.writeFile('./swiss.json', JSON.stringify(App.data), 'utf8', function (err) {
    if (err) {
      return console.log(err);
    } else {
      console.log("Writing Mew Data Success")
    }
  });
}
/**
 * 
 * Update Data from xls file 
 */
function updateDataXlsx(latest) {
  console.log('Reading Data for XLSX file')
  var buffer = fs.readFileSync("swiss.src.json");
  var data = JSON.parse(buffer)
  App.data = data;
  // Setting the Data 
  App.data.total = sumCases(latest, 'cases')
  App.data.day = getDate();
  var cantons = App.data.objects.cantons.geometries;
  var cantonsUpdate = _.map(cantons, (element) => {
    var canton = _.find(latest, (o) => {
      return o.canton == element.id
    })
    console.log('canton', canton)
    if (!canton) {
      console.log('Canton Does not exist', element.id)
      var props = {
        properties: {
          id: element.id,
          name: element.properties.name,
          cases: 0
        }
      }
      // return
    } else {
      console.log('Canton   exists', element.id)
      var props = {
        properties: {
          id: element.id,
          name: element.properties.name,
          cases: canton.cases
        }
      }
    }
    return _.extend({}, element, props);
  })
  App.data.objects.cantons.geometries = cantonsUpdate
  writeFile(App.data)
}
/** 
 * Update New Data
 *  */
function updateDataNew(latest) {
  console.log('Data', latest[0])
  if (App.dataUpdated == 0) {
    var buffer = fs.readFileSync("swiss.src.json");
    var data = JSON.parse(buffer)
    App.data = data;
  }
  App.data.total = sumCases(latest, 'ncumul_conf')
  App.data.deaths = sumCases(latest, 'ncumul_deceased')
  App.data.day = getDate();
  var cantons = App.data.objects.cantons.geometries
  var cantonsUpdate = _.map(cantons, (element) => {
    var canton = _.find(latest, (o) => {
      return o.abbreviation_canton_and_fl == element.id
    })
    console.log('canton', canton)
    if (!canton) {
      console.log('Canton Does not exist', element.id)
      var props = {
        properties: {
          id: element.id,
          name: element.properties.name,
          cases: 0,
          fata: 0
        }
      }
      // return
    } else {
      console.log('Canton   exists', element.id)
      var props = {
        properties: {
          id: element.id,
          name: element.properties.name,
          cases: canton.ncumul_conf,
          fata: canton.ncumul_deceased
        }
      }
    }
    return _.extend({}, element, props);
  })
  App.data.objects.cantons.geometries = cantonsUpdate
  writeFile(App.data)
}
/** Update the Data file */
function updateData(latest, type) {
  if (App.dataUpdated == 0) {
    var buffer = fs.readFileSync("swiss.src.json");
    var data = JSON.parse(buffer)
    App.data = data;
  }
  console.log('Reading Cantons: ', App.data.objects.cantons.geometries.length)
  var cantons = App.data.objects.cantons.geometries
  App.data.day = latest.day
  if (type == 'fata') {
    console.log('Total Fatailities Updated :', latest.CH)
    App.data.fataTotal = latest.CH
  } else {
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
    if (type == 'fata') {
      props.properties.fata = latest[element.id] || 0
      props.properties.cases = element.properties.cases;
      console.log('\x1b[36m', props.properties.name, '\x1b[0m');
      console.log('=')
      console.log(props.properties)
      console.log('-----------------------------')
    } else {
      props.properties.cases = latest[element.id] || 0;
    }
    return _.extend({}, element, props);
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
    console.log("Example app listening at", App.URL)
  })();
}
/** Csv to JSON */
function csvToJson(csv) {
  // console.log('csv',csv)
  const content = csv.split('\n');
  // console.log('content',content)
  const header = content[0].split(',');
  // console.log('header',header)
  var c = _.tail(content).map((row) => {
    return _.zipObject(header, row.split(','));
    console.log(c)
  });
  return c
}
/**Create Tweet and Publish to Twitter */
function createTweet() {
  var image = require('fs').readFileSync('swiss.png');
  console.log("Reading Image", image)
  if(!image){
    throw Error('createTweetErr', "Image is not loaded")
  }
  client.post('media/upload', {
    media: image
  }, function (error, media, response) {
    if (!error) {
      console.log("Uploading the Image file");
      console.log(media);
      console.log("Success: Image file uploaded");
      var status = {
        status: 'Schweizer Fachinformationen zu Medikamenten nachschlagen mit #AmiKoDesitin https://www.ywesee.com/AmiKo/Index. Karte generiert mit https://github.com/zdavatz/covid2019_ch_map - Daten sind von hier https://www.bag.admin.ch/dam/bag/de/dokumente/mt/k-und-i/aktuelle-ausbrueche-pandemien/2019-nCoV/covid-19-datengrundlage-lagebericht.xlsx.download.xlsx/200325_Datengrundlage_Grafiken_COVID-19-Bericht.xlsx -> http://covid19.ddrobotec.com/ #ddrobotec #ywesee #public #domain #opensource #bag',
        media_ids: media.media_id_string
      }
      client.post('statuses/update', status, function (error, post, response) {
        if (!error) {
          console.log("Success", "The Tweet has been posted to Twitter", post.id_str);
          console.log("Tweet", "https://twitter.com/" + post.user.screen_name + '/status/' + post.id_str)
        }
        exit()
      });
    } else {
      console.log("Twitter upload error", error)
    }
  });
}
/**exit */
function exit() {
  console.log('Terminating the script')
  process.exit(-1)
}
/** */
function csvParse(data) {
  if (!data) {
    throw Error('No-data', "csvParse: Please submit the data")
    return
  }
  var data = JSON.parse(data)
  var json = Papa.parse(data, {
    header: true
  })
  return json
}
/** */
function sumCases(collection, field) {
  var total = _.map(collection, (o) => {
    var count = parseInt(o[field])
    return count
  })
  var total = _.without(total, NaN);
  var total = _.sum(total)
  return total
}
/**
 * Get Date
 */
function getDate() {
  var currentDate = new Date()
  var day = currentDate.getDate()
  var month = currentDate.getMonth() + 1
  var year = currentDate.getFullYear()
  return day + "-" + month + "-" + year
}
/** */
function log(obj) {
  _.each(obj, (val, key) => {
    console.log({
      key: val
    });
  });
}
