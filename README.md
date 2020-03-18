# covid2019 MAP of Switzerland
Create a map of Switzerland and plot the COVID19 data on the map.

## Use Cases
1. Use the data from [daenuprobst](https://github.com/daenuprobst/covid19-cases-switzerland/blob/master/covid19_cases_switzerland.csv). He parses that data from the [BAG Twitter feed](https://twitter.com/BAG_OFSP_UFSP/).
2. Show the increase in % by Canton
3. Generate a png file.
4. Use Twitter API to post the generated PNG on your timeline.
5. Configure Twitter API so you can add some static text/hashtag to every tweet.
6. Tweet is being posted if there is new data from [daenuprobst](https://github.com/daenuprobst/).
7. Use [t](https://github.com/sferik/t) to create credentials.


## Configuration
-  Create ".env" file with Twitter App credentials, you can get it from here: [](https://developer.twitter.com)

```
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_CONSUMER_TOKEN_KEY=
TWITTER_CONSUMER_TOKEN_SECRET=

```

## Running Modes

Switch between Development and Production mode with simple switch in "main.js"


```
    App.isProduction = true;

```

## Run

```
$ npm i
$ node main.js
```


## Software used to build the svg images
https://github.com/interactivethings/swiss-maps

## License
[GPLv3.0](https://github.com/zdavatz/covid2019_ch_map/blob/master/LICENSE)
