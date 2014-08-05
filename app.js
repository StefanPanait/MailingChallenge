var express = require('express')
var app = express(),
    exphbs = require('express3-handlebars'),
    database = require('./db');

app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))

app.set('views', __dirname + '/views');
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
    var dayCount = database.getDayCount();
    database.countMailingtable(function(err, emailCount) {
        database.updateReport(function(domains) {
            res.render('report', {
                domains: domains,
                emailCount: emailCount,
                dayCount: dayCount
            });
        });
    });
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

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'))
    database.init();
})
