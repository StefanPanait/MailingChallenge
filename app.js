"use strict";
var express = require('express'),
    exphbs = require('express3-handlebars'),
    database = require('./db'),
    app = express();

app.set('views', __dirname + '/views');
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
    console.log("root");
    res.send("<a href='/'>Click here</a> in a minute, server is re-starting ");
    /*    var dayCount = database.getDayCount();
    database.countMailingtable(function(err, emailCount) {
        database.updateReport(function(domains) {
            res.render('report', {
                domains: domains,
                emailCount: emailCount,
                dayCount: dayCount
            });
        });
    });*/
});

app.get('/passTime', function(req, res) {
    console.log("passing time");
    database.passTime(function() {
        database.updateDomainsTable(function() {
            res.redirect("/");

        });
    });

});

app.get('/updateReport', function(req, res) {
    res.redirect("/");
});


app.get('/emails', function(req, res) {
    database.getAllEmails(function(err, rows) {
        if (err) console.log(err);
        res.render("emails", {
            emails: rows
        });
    });
});

app.get('/clearSimulation', function(req, res) {
    //database.createTables();
    res.send("<a href='/'>Click here</a> in a minute, server is re-starting ");
});
var server = app.listen(3000, function() {
    //console.log("init db");
    //database.init();
    console.log('Listening on port %d', server.address().port);
});
