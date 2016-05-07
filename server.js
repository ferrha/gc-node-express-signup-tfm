//Get modules.
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var app = express();
var projectId = process.env.GCLOUD_PROJECT;

// Initialize gcloud
var gcloud = require('gcloud');
var options = {
  projectId: projectId
};

// Get a reference to the datastore component
var datastore = gcloud.datastore(options);

// Get a reference to the pubsub component
var pubsub = gcloud.pubsub();

// Get a reference to the topic name
var topic = pubsub.topic('subscription');

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

//GET home page.
app.get('/', routes.index);

//POST signup form.
app.post('/signup', function(req, res) {
  var nameField = req.body.name,
      emailField = req.body.email,
      previewBool = req.body.previewAccess;
  signup(nameField, emailField, previewBool);
  res.send(200);
});

//Add signup form data to database.
function signup (nameSubmitted, emailSubmitted, previewPreference) {

  var taskKey = datastore.key('Subscriber');

  datastore.save({
    key: taskKey,
    data: {
      email: emailSubmitted,
      name: nameSubmitted,
      preview: previewPreference
    }
  }, function(err) {
    if (err) {
      console.log('Error adding item to database: ', err);
    } else {
      console.log('Form data added to database.');

      // Subscribe
      pubsub.subscribe('subscription', 'newSubscriber', {
        ackDeadlineSeconds: 90,
        autoAck: true,
        interval: 30
      }, function(err, subscription, apiResponse) {
        if (err) {
          console.log('Error adding item to database: ', err);
        }
        console.log('Subscribed ' + subscription + ' - ' + apiResponse);
      });

      // Send email
      topic.publish({
        data: 'Thank you ' + nameSubmitted + ' for subscribe, you will receive new updates soon ;)'
      }, function(err) {
        if(err){
          console.log('Error sending email: ' + err);
        }
        console.log('Message sent successfully!');
      });
      callback(null, taskKey);
    }
  });

}
