/*

checks all accounts with label for active shopping campaigns with no impressions
run everyday
  
*/

var EMAIL1 = 'example@example.com'; // for multiple; seperate by comma
var ACCOUNTLABEL = 'Account Label Name'; // use only 1 label

// functions - do not alter ************************************************************
function main() {
  var activeAccounts = MccApp.accounts();
  activeAccounts.withCondition("Labels CONTAINS '" + ACCOUNTLABEL + "'");
  activeAccounts.executeInParallel('checkandsend');
}

function checkandsend() {
  
  changer = 0;
  mailinfo = '';

  var notrafficcampaigns = AdWordsApp.report(
    "SELECT CampaignName, Clicks, AdvertisingChannelType, CampaignStatus, Impressions, AccountDescriptiveName " +
    "FROM   CAMPAIGN_PERFORMANCE_REPORT " +
    "WHERE " + 
        "AdvertisingChannelType = SHOPPING " +
        "AND CampaignStatus = ENABLED " +
        "AND Impressions < 1 " + 
    " DURING TODAY" );
  
  var rows = notrafficcampaigns.rows(); // runs through AWQL results
  while (rows.hasNext()) {
    var row = rows.next();
    var campaignName = row['CampaignName'];
    var impressions = row['Impressions'];
    var accountName = row['AccountDescriptiveName'];
    var ARGH = campaignName + ' has ' + impressions + ' impressions';
    var changer = changer + 1;
    var mailinfo = mailinfo + ARGH + '\n';
  }
  if (changer > 0) {
    Logger.log(mailinfo);
    MailApp.sendEmail(EMAIL1,
                      '⚠️ ' + accountName + ' contains shopping campaigns with no impressions ⚠️',
                      mailinfo);
  }
}
