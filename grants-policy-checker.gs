/*
  Grants Policy Checker Script
  By Bas Baudoin
  
  Instructions:
  - Label accounts and add account label to the activeAccountLabel variable
  - DateRange can be ignored
  - Add email address(es) for results
  - Add approved branded keywords to brandNames
  
  Checks for:
  - single word keywords
  - low quality score keywords (1 or 2)
  - less than 2 adgroups per campaign
  - less than 2 ads per adgroup
  - CTR < 5% last week
*/

var activeAccountLabel = 'Actief beheer';
var dateRange = 'TODAY'; // e.g. TODAY, YESTERDAY, LAST_7_DAYS
var email = ['test@gmail.com']; // multiple in string, e.g. ['e@e.nl, a@a.nl']
var brandNames = ['brand1',
                  'brand2'
                 ];
var excludeAccountNameContains = 'Paid';


// functions - do not alter ************************************

function main() {
  var activeAccounts = MccApp.accounts();

  activeAccounts
    .withCondition("LabelNames CONTAINS '" + activeAccountLabel + "'")
  	.withCondition("Name DOES_NOT_CONTAIN_IGNORE_CASE '" + excludeAccountNameContains + "'")
  	.withCondition("Name DOES_NOT_CONTAIN_IGNORE_CASE 'Betaald'"); // remove when exporting
  activeAccounts.executeInParallel('runChecks');
}

function runChecks() {
  var accountName = AdsApp.currentAccount().getName()

  var qScoreData = getLowQScoreQueries()
  var singleWordKeywords = getSingleWordKeywords()
  var adGroupsPerCampaign = getAdGroupsPerCampaign()
  var adsPerAdgroup = getAdsPerAdgroup()
  var ctrLastWeek = getCtrLastWeek()
  var disapprovedAds = getDisapprovedAds()

  // checks
  Logger.log(accountName)
  Logger.log(qScoreData)
  Logger.log(singleWordKeywords)
  Logger.log(adGroupsPerCampaign)
  Logger.log(adsPerAdgroup)
  Logger.log(ctrLastWeek)
  Logger.log(disapprovedAds)

  if (qScoreData.length > 0 || singleWordKeywords.lenght > 0 || adGroupsPerCampaign.length > 0 || adsPerAdgroup.length > 0 || ctrLastWeek.length > 0) {

    MailApp.sendEmail(email,
      'Grants checker results ' + accountName,
      qScoreData + '\n' + singleWordKeywords + '\n' + adGroupsPerCampaign + '\n' + adsPerAdgroup + '\n' + ctrLastWeek + '\n' + disapprovedAds);
  }
}

function getDisapprovedAds() {
  var resultsString = "";

  var adRows = AdWordsApp.report(
    " SELECT CombinedApprovalStatus " +
    " FROM AD_PERFORMANCE_REPORT " + 
    " WHERE Status = ENABLED " + 
    " AND CampaignStatus = 'ENABLED' " +
    " AND AdGroupStatus = 'ENABLED' " +
    " DURING " + dateRange);

  var rows = adRows.rows();

  if (rows.hasNext()) {
    resultsString = "Has enabled disapproved ads";
  }
  
  return resultsString;
}

function getLowQScoreQueries() {
  var resultsString = "";

  var keywordRows = AdWordsApp.report(
    " SELECT Criteria, QualityScore, AccountDescriptiveName " +
    " FROM  KEYWORDS_PERFORMANCE_REPORT " + 
    " WHERE Status = ENABLED " + 
    " AND CampaignStatus = 'ENABLED' " +
    " AND AdGroupStatus = 'ENABLED' " +
    " AND QualityScore < 4 " + 
    " DURING " + dateRange);

  var rows = keywordRows.rows();

  while (rows.hasNext()) {
    var row = rows.next();
    var qScore = row['QualityScore'];
    var keyword = row['Criteria'];

    if (qScore == '1' || qScore == '2') {
      resultsString += (keyword + " met qScore " + qScore + " \n");
    }
  }
  
  return resultsString;
}

function getSingleWordKeywords() {
  var resultsString = "";

  var keywordRows = AdWordsApp.report(
    " SELECT Criteria, QualityScore, AccountDescriptiveName " +
    " FROM  KEYWORDS_PERFORMANCE_REPORT " + 
    " WHERE Status = ENABLED " + 
    " AND CampaignStatus = 'ENABLED' " +
    " AND AdGroupStatus = 'ENABLED' " +
    " DURING " + dateRange);

  var rows = keywordRows.rows();

  while (rows.hasNext()) {
    var row = rows.next();
    var keyword = row['Criteria'];
    
    if (keyword.indexOf(' ') < 0 && brandNames.indexOf(keyword) < 0) {
      resultsString += (keyword + " is a single word keyword\n");
    }
  }
  
  return resultsString;
}

function getAdGroupsPerCampaign() {
  var resultsString = '';
  
  var campaignIterator = AdWordsApp.campaigns()
    .withCondition('Status = ENABLED')
    .get();
  
  var totalCampaigns = campaignIterator.totalNumEntities();
  
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var campaignName = campaign.getName();
    var adGroupIterator = campaign.adGroups()
    	.withCondition('Status = ENABLED')
        .get();
    var totalAdgroups = adGroupIterator.totalNumEntities();
    // Logger.log(campaignName + ' has adgroups# ' + totalAdgroups);
    if (totalAdgroups < 2) {
      resultsString += '\n ' + campaignName + ' has ' + totalAdgroups + ' adgroup';
    }
  }
  return resultsString;
}

function getAdsPerAdgroup() {
  var resultsString = '';
  
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('Status = ENABLED')
    .withCondition('CampaignStatus = ENABLED')
    .get();
  
  var totalAdGroups = adGroupIterator.totalNumEntities();
  
  while (adGroupIterator.hasNext()) {
    var adGroup = adGroupIterator.next();
    var adGroupName = adGroup.getName();
    var adIterator = adGroup.ads()
    	.withCondition('Status = ENABLED')
        .get();
    var totalAds = adIterator.totalNumEntities();
    // Logger.log(adGroupName + ' has ads# ' + totalAds);
    if (totalAds < 2) {
      resultsString += '\n ' + adGroupName + ' has ' + totalAds + ' ad';
    }
  }
  
  return resultsString;
}

function getCtrLastWeek() {
  var resultsString = '';

  var account = AdsApp.currentAccount()
  var stats = account.getStatsFor('LAST_WEEK')
  var ctr = stats.getCtr()
  Logger.log(ctr)
  
  if (ctr < 0.05) {
    resultsString += '\n' + 'Account has CTR < 5% last week (' + ctr + ')'
  }
  return resultsString
}
