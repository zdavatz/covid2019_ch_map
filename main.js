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
const Twitter = require('twitter');

//Loads the handlebars module
const handlebars = require('express-handlebars');
//Sets our app to use the handlebars engine
app.set('view engine', 'handlebars');


/** App Configs */
App = {}
App.PORT = 3033;
App.URL = 'http://localhost:' + App.PORT;
App.post = "";
App.DataSrcURL = "https://raw.githubusercontent.com/daenuprobst/covid19-cases-switzerland/master/covid19_cases_switzerland.csv"
App.DataSrcJSON = null;
App.ExportedImage = require('fs').readFileSync('swiss.png');
App.day = "";
var jsonData;

require('dotenv').config();

// console.log(process.env)
/** */

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_CONSUMER_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_CONSUMER_TOKEN_SECRET
});








/** Express */
app.use(express.static('.'))
// app.get('/', function (req, res) {
//   res.sendFile(path.join(__dirname + '/index.html'));
// });

// app.get('/', (req, res) => {
//   fs.readFile(__dirname + '/index.html', (err, html) => {
//     res.send(ejs.render(html, JSON.stringify(App)))
//   })
// })
//Sets handlebars configurations (we will go through them later on)
app.engine('handlebars', handlebars({
  layoutsDir: __dirname + '/',
  }));

app.get('/', (req, res) => {
  //Serves the body of the page aka "main.handlebars" to the container //aka "index.handlebars"
  res.render('main', {layout : 'index', data:APP});
  });


app.listen(App.PORT);
/** Reading the Remote Data */
console.log("Example app listening at", App.URL)
/** Reading Source file*/
requestData()




/** */
function requestData() {
  request.get(App.DataSrcURL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = csvToJson(body);
      var latest = json[11];
      latest.day = latest[Object.keys(latest)[0]]
      console.log('Grapping Data: latest day', latest.day)
      if (latest) {
        updateData(latest)
        generatePng()
        createTweet(App.ExportedImage)
        
      } else {
        console.log('Error', 'The latest data is missing')
      }

    } else {
      console.log('Error: Remote file does not exist')
    }
  });
}

/** Update the Data file */
function updateData(latest) {
  var buffer = fs.readFileSync("map.source.json");
  var data = JSON.parse(buffer)
  console.log('Reading Cantons: ', data.objects.cantons.geometries.length)
  var cantons = data.objects.cantons.geometries
  data.day = latest.day
  data.total = latest.CH

  var cantonsUpdate = _.map(cantons, (element) => {
    var cases = latest[element.id] || 0;
    // console.log(latest)
    return _.extend({}, element, {

      properties: {
        id: element.id,
        name: element.properties.name,
        cases: cases,
 
      }
    });
  })
  data.objects.cantons.geometries = cantonsUpdate
  console.log("Success","Cantons data updated")
  /**Writing new Data */
  fs.writeFile('./swiss.json', JSON.stringify(data), 'utf8', function (err) {
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
  return _.tail(content).map((row) => {
    return _.zipObject(header, row.split(','));
  });
}
/**Create Tweet and Publish to Twitter */
function createTweet(image) {
  client.post('media/upload', {
    media: image
  }, function (error, media, response) {
    if (!error) {
      console.log("Uploading the Image file");
      console.log(media);
      console.log("Success: Image file uploaded");
      var status = {
        status: 'Swiss #covid',
        media_ids: media.media_id_string // Pass the media id string
      }
      client.post('statuses/update', status, function (error, post, response) {
        if (!error) {
          console.log("Success", "The Tweet has been posted to Twitter", post.id_str);
          console.log("Tweet", "https://twitter.com/"+ post.user.screen_name + '/status/' + post.id_str)
          exit()
        }
      });
    } else {
      console.log("Twitter upload error", error)
    }
  });
}
/**exit */
function exit(){
  process.kill(process.pid);
  // process.exit(22);
}