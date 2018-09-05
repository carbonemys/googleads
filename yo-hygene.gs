/*
 Script by: Bas Baudoin 🦆
 - template sheet optional
 - works 2018-09-05
 - average runtime ~ 30 - 3600 sec.
 
 v1.01
 template: https://docs.google.com/spreadsheets/d/1QCN6GQC-Qy4ccrZPYc2vIhkoiaBfbgGDw6OUR11o7Vs/edit#gid=0
*/

// ** settings **
var spreadsheetUrl = 'https://docs.google.com/spreadsheets/url';

// ** data **
var spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
var sheets = spreadsheet.getSheets();

function main() {
  
  // delete everything from the spreadsheet
  resetSheet();
  
  // get functions return array => [name, displayValue (, data for separate sheet)]
  //   data for separate sheet struture [[campaign, adgroup(, keyword)], [...
  
  var accountData = getAccountData();
  
  var deviceData = getDeviceData();
  
  var LinRodnitzkyData = getLinRodnitzkyData();

  var keywordData = getKeywordData();
  
  var adGroupData = getAdGroupData();

  var campaignData = getCampaignData();
  
  var extensionData = getExtensionData();

  var shoppingData = getShoppingData();
  
  var allDataOverview = [
    accountData,
    deviceData,
    LinRodnitzkyData,
    keywordData,
    adGroupData,
    campaignData,
    extensionData,
    shoppingData
  ];

  var allData = [
    keywordData,
    adGroupData
  ];

  addToOverview(allDataOverview);
  addDataToSheet(allData);
  
}

function getDeviceData () {
  var deviceData = [];
  
  var mobileCost = 0;
  var desktopCost = 0;
  var mobileConversions = 0;
  var desktopConversions = 0;
  var mobileCostPerConversion = 0;
  var desktopCostPerConversion = 0;
  var mobileConversionRate = 0;
  var desktopConversionRate = 0;
  
  var deviceReport = AdWordsApp.report(
    "SELECT Device, Cost, Conversions, CostPerConversion, ConversionRate, Impressions " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    "DURING LAST_30_DAYS ");
  
  var rows = deviceReport.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var device = row['Device'];
    var cost = row['Cost'];
    var conversions = row['Conversions'];
    var costPerConversion = row['CostPerConversion'];
    var conversionRate = row['ConversionRate'];

    if (device == 'Computers') {
      desktopCost = cost;
      desktopConversions = conversions;
      desktopCostPerConversion = costPerConversion;
      desktopConversionRate = conversionRate;
    } else if (device == 'Mobile devices with full browsers') {
      mobileCost = cost;
      mobileConversions = conversions;
      mobileCostPerConversion = costPerConversion;
      mobileConversionRate = conversionRate;
    }
  }
  
  deviceData.push(['Mobile vs. desktop', '']);
  deviceData.push(['Cost', 'm: ' + mobileCost + ' - d: ' + desktopCost]);
  deviceData.push(['Conversions', 'm: ' + mobileConversions + ' - d: ' + desktopConversions]);
  deviceData.push(['Cost/conv', 'm: ' + mobileCostPerConversion + ' - d: ' + desktopCostPerConversion]);
  deviceData.push(['Conv. rate', 'm: ' + mobileConversionRate + ' - d: ' + desktopConversionRate]);
  
  return deviceData;
}

function getAccountData () {
  var accountData = [];

  var accountName = AdWordsApp.currentAccount().getName();
  var accountId = AdWordsApp.currentAccount().getCustomerId();
  var hasConversions = 'No';
  var budgetLostImpShare = '';
  var rankLostImpShare = '';
  var totalConversions = 0;
  var gadsConversions = 0;
  var analyticsConversions = 0;
  var hasAttributionModelling = 'No';
  
  // check for conversions in last 30 days
  var accountConversions = parseFloat(AdWordsApp.currentAccount().getStatsFor('LAST_30_DAYS').getConversions());
  if (accountConversions > 0) {
    hasConversions = 'Yes';
  }
  
  // account performance data
  var accountPerfData = AdWordsApp.report(
    "SELECT SearchBudgetLostImpressionShare, SearchRankLostImpressionShare " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    " DURING LAST_7_DAYS ");
  
  var rows = accountPerfData.rows();
  while (rows.hasNext()) { // there is just one row
    var row = rows.next();
    budgetLostImpShare = row['SearchBudgetLostImpressionShare'];
    rankLostImpShare = row['SearchRankLostImpressionShare'];
  }
  
  // account conversion
  var accountConversionData = AdWordsApp.report(
    "SELECT Conversions, ConversionCategoryName, ConversionTypeName, ExternalConversionSource " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    " DURING LAST_30_DAYS ");
  
  
  var rows = accountConversionData.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    totalConversions++;
    var numberOfConversions = parseFloat(row['Conversions']);
    if (numberOfConversions % 1 != 0) {
      hasAttributionModelling = 'Yes';
    }
    var conversionSource = row['ExternalConversionSource'];
    if (conversionSource == 'Analytics') {
      analyticsConversions++;
    } else if (conversionSource == 'Website') {
      gadsConversions++;
    }
  }
  
  accountData.push(['', '', '']);
  accountData.push(['Account information', '']);
  accountData.push(['Account name', accountName]);
  accountData.push(['Accound id', accountId]);
  accountData.push(['Lost impressions (budget)', budgetLostImpShare]);
  accountData.push(['Lost impressions (rank/cpc)', rankLostImpShare]);

  accountData.push(['', '', '']);
  accountData.push(['Conversion tracking', '', '']);
  accountData.push(['Google Ads conversions', gadsConversions + '/' + totalConversions]);
  accountData.push(['Analytics conversions', analyticsConversions + '/' + totalConversions]);
  accountData.push(['Has attribution model (x % 1 = 0)', hasAttributionModelling]);
  
  return accountData;
}

function getKeywordData () {
  var keywordData = [];
  
  var totalKeywords = 0;
  var capitalLetterWords = [];
  var punctuationMarkWords = [];
  var lowQscoreKeywords = [];
  var nullQscoreKeywords = [];

  var keywordsIterator = AdWordsApp.keywords()
  .withCondition('CampaignStatus = ENABLED')
  .withCondition('AdGroupStatus = ENABLED')
  .withCondition('Status = ENABLED')
  .get();
  
  var totalKeywords = keywordsIterator.totalNumEntities();

  // loops through all enabled keywords
  while (keywordsIterator.hasNext()) {
    var keyword = keywordsIterator.next();
    var keywordText = keyword.getText();
    var campaign = keyword.getCampaign().getName();
    var adGroup = keyword.getAdGroup().getName();
    var qscore = keyword.getQualityScore();
    
    // hoofdletter check
    if (keywordText.toLowerCase() !== keywordText) {
      capitalLetterWords.push([campaign, adGroup, keywordText]);
    }
    
    // punctuation check (only allowed google ads characters)
    if (keywordText.replace('-') !== keywordText || keywordText.replace('/') !== keywordText || keywordText.replace('.') !== keywordText || keywordText.replace('.') !== keywordText || keywordText.replace('&') !== keywordText) {
      punctuationMarkWords.push([campaign, adGroup, keywordText]);
    }
    
    // low qscore check
    var minQscore = 5;
    if (qscore == null) {
      nullQscoreKeywords.push([campaign, adGroup, keywordText]);
    } else if (parseFloat(qscore) < minQscore) {
      lowQscoreKeywords.push([campaign,adGroup, keywordText + ' ' + qscore]);
    }
    
  }
  
  keywordData.push(['Keyword data', '']);
  keywordData.push(['Capital letters', capitalLetterWords.length + '/' + totalKeywords, capitalLetterWords]);
  keywordData.push(['Punctuation marks', punctuationMarkWords.length + '/' + totalKeywords, punctuationMarkWords]);
  keywordData.push(['Qscore is null', nullQscoreKeywords.length + '/' + totalKeywords, nullQscoreKeywords]);
  keywordData.push(['Qscore < 5', lowQscoreKeywords.length + '/' + totalKeywords, lowQscoreKeywords]);
  
  return keywordData;
}

function getAdGroupData () {
  var adGroupData = [];
  
  var adGroupStaData = [];
  var adGroupEtaData = [];
  var adGroupMixedMatchTypesData = [];
  
  var adGroupIterator = AdWordsApp.adGroups()
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('Status = ENABLED')
    .withCondition("AdvertisingChannelType = SEARCH")
    .get();
  
  var totalAdGroups = adGroupIterator.totalNumEntities();
  
  // number of standard text ads
  while (adGroupIterator.hasNext()) {
  	var adGroup = adGroupIterator.next();
    var adGroupName = adGroup.getName();
    var campaignName = adGroup.getCampaign().getName();
    
    var staIterator = adGroup.ads()
      .withCondition('Status = ENABLED')
      .withCondition('Type = TEXT_AD')
      .get();
    
    if (staIterator.totalNumEntities() > 0) {
      adGroupStaData.push([campaignName, adGroupName, ' ']);
    } 
  
    // three or more ETA's
    var EtaIterator = adGroup.ads()
      .withCondition('Status = ENABLED')
   	  .withCondition('Type = EXPANDED_TEXT_AD')
      .get();

    if (EtaIterator.totalNumEntities() < 3) {
      adGroupEtaData.push([campaignName, adGroupName, ' '])
    }
    
    // mixed match types
    var matchTypeIterator = adGroup.keywords()
      .withCondition('Status = ENABLED')
      .get();
    
    if (matchTypeIterator.hasNext()) {
    	var firstMatchType = matchTypeIterator.next().getMatchType();
    }
    
    var found = false;
    while (matchTypeIterator.hasNext()) {
      var keyword = matchTypeIterator.next();
      var matchType = keyword.getMatchType();
      
      if (matchType !== firstMatchType && !found) {
        adGroupMixedMatchTypesData.push([campaignName, adGroupName, ' ']);
        found = true;
      }
    }
    
  } // end adgroupiterator
  
  adGroupData.push(['AdGroup data', '']);
  adGroupData.push(['Adgroups with standard Text Ads', adGroupStaData.length + '/' + totalAdGroups, adGroupStaData]);
  adGroupData.push(['Adgroups with less than 3 ETAs', adGroupEtaData.length + '/' + totalAdGroups, adGroupEtaData]);
  adGroupData.push(['Adgroups with mixed match types', adGroupMixedMatchTypesData.length + '/' + totalAdGroups, adGroupMixedMatchTypesData]);
  return adGroupData;
}

function getCampaignData () {
  var campaignData = [];
  
  var hasAnalyticsViews = 'No';
  var sitelinkData = [];
  var highlightData = [];
  var snippetData = [];
  var callData = [];
  var rlsaData = [];
  var adScheduleData = [];
  var experimentData = [];
  var rotationData = [];
  var negativeKeywordListData = [];
  var deviceData = [];
  
  // bidding variables
  var manualData = [];
  var conversionOptimizerData = [];
  var cpaData = [];
  

  var campaignIterator = AdWordsApp.campaigns()
    .withCondition('Status = ENABLED')
    .withCondition('AdvertisingChannelType = SEARCH')
    .get();
  
  var totalCampaigns = campaignIterator.totalNumEntities();
  
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var campaignName = campaign.getName();
    var stats = campaign.getStatsFor('LAST_30_DAYS');
    
    // check for analytics data
    // parsefloat is for when it's not a number ?
    var campaignAnalyticsViews = parseFloat(stats.getAveragePageviews());
    if (campaignAnalyticsViews > 0) hasAnalyticsViews = 'Yes';
    
    // check for less than 4 sitelinks
    var sitelinkIterator = campaign.extensions().sitelinks().get();
    if (sitelinkIterator.totalNumEntities() < 4) {
      sitelinkData.push([campaignName, ' ', ' ']);
    }
    
    // check for less than 4 highlights
    var highlightIterator = campaign.extensions().callouts().get();
    if (highlightIterator.totalNumEntities() < 4) {
      highlightData.push([campaignName, ' ', ' ']);
    }
    
    // check for has no snippets
    var snippetIterator = campaign.extensions().snippets().get();
    if (snippetIterator.totalNumEntities() === 0) {
      snippetData.push([campaignName, ' ', ' ']);
    }
    
    // check for call extensions
    var callIterator = campaign.extensions().phoneNumbers().get();
    if (callIterator.totalNumEntities() === 0) {
      callData.push([campaignName, ' ', ' ']);
    }
    
    // check for rlsa
    var rlsaIterator = campaign.targeting().audiences().get();
    if (rlsaIterator.totalNumEntities() === 0) {
      rlsaData.push([campaignName, ' ', ' ']);
    }
    
    // check for ad schedules
    var adScheduleIterator = campaign.targeting().adSchedules().get();
    if (adScheduleIterator.totalNumEntities() === 0) {
      adScheduleData.push([campaignName, ' ', ' ']);
    }
    
    // check for device settings
    var deviceIterator = campaign.targeting().platforms().mobile().get().next();
    if (deviceIterator.getBidModifier() != '1.0') {
      deviceData.push([campaignName, ' ', ' ']);
    }
    
    // check for experiments
    var experimentIterator = campaign.experiments().get();
    if (experimentIterator.totalNumEntities() === 0) {
      experimentData.push([campaignName, ' ', ' ']);
    }
    
    // check for auto ad rotation
    var rotationType = campaign.getAdRotationType().toString();
    if (rotationType != 'OPTIMIZE') {
      rotationData.push([campaignName, ' ', ' ']);
    }
    
    // check for negative keyword lists
    var negativeListIterator = campaign.negativeKeywordLists().get();
    if (negativeListIterator.totalNumEntities() == 0) {
      negativeKeywordListData.push([campaignName, ' ', ' ']);
    }
    
    // BIDDING
    var biddingStrategy = campaign.getBiddingStrategyType();
    if (biddingStrategy == 'PERCENT_CPA') {
      cpaData.push(campaignName);
    } else if (biddingStrategy == 'MANUAL_CPC') {
      manualData.push(campaignName);
    } else if (biddingStrategy == 'CONVERSION_OPTIMIZER') {
      conversionOptimizerData.push(campaignName);
    } else {
      Logger.log('Campaign with no bidding strategy?');
    }
  }

  campaignData.push(['Campaign data', '']);
  campaignData.push(['Analytics linked (has views)', hasAnalyticsViews]);
  
  campaignData.push(['Campaigns with no RLSA', rlsaData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with no ad schedule', adScheduleData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with no experiments', experimentData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with no ad rotation', rotationData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with no negative keyword list', negativeKeywordListData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns mobile bid adjustments', deviceData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with manual cpc', manualData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with target CPA', cpaData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with conversion optimizer', conversionOptimizerData.length + '/' + totalCampaigns]);
  
  campaignData.push(['', '']); // spacing
  campaignData.push(['Campaign extensions', '']); // spacing
  campaignData.push(['Campaigns with less than 4 sitelinks', sitelinkData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with less than 4 highlights', highlightData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with no snippets', snippetData.length + '/' + totalCampaigns]);
  campaignData.push(['Campaigns with no call extensions', callData.length + '/' + totalCampaigns]);

  return campaignData;
}

function getExtensionData () {
  var extensionData = [];
  
  var hasHighlights = 'No';
  var hasSitelinks = 'No';
  var hasSnippets = 'No';
  var hasCall = 'No';
  var hasMessage = 'No';
  
  var highlightIterator = AdWordsApp.currentAccount().extensions().callouts().get();
  if (highlightIterator.totalNumEntities() > 0) {
    hasHighlights = 'Yes';
  }
  
  var sitelinkIterator = AdWordsApp.currentAccount().extensions().sitelinks().get();
  if (sitelinkIterator.totalNumEntities() > 0) {
    hasSitelinks = 'Yes';
  }
  
  var snippetIterator = AdWordsApp.currentAccount().extensions().snippets().get();
  if (snippetIterator.totalNumEntities() > 0) {
    hasSnippets = 'Yes';
  }
  
  var callIterator = AdWordsApp.currentAccount().extensions().phoneNumbers().get();
  if (callIterator.totalNumEntities() > 0) {
    hasCall = 'Yes';
  }
  
  var messageIterator = AdWordsApp.currentAccount().extensions().messages().get();
  if (messageIterator.totalNumEntities() > 0) {
    hasMessage = 'Yes';
  }
  
  extensionData.push(['Account extension data', '']);
  extensionData.push(['Has account highlights', hasHighlights]);
  extensionData.push(['Has account sitelinks', hasSitelinks]);
  extensionData.push(['Has account snippets', hasSnippets]);
  extensionData.push(['Has account call extensions', hasCall]);
  extensionData.push(['Has account message extensions', hasMessage]);
  
  return extensionData;
}

function getShoppingData () {
  var shoppingData = [];
  
  var hasShoppingProducts = 'No';
  
  var shoppingIterator = AdWordsApp.productAds().get();
  var productAdsNumber = parseFloat(shoppingIterator.totalNumEntities());
  
  if (productAdsNumber > 0) {
    hasShoppingProducts = 'Yes';
  }
  
  shoppingData.push(['Shopping data', '']);
  shoppingData.push(['Has merchants data', hasShoppingProducts]);
  return shoppingData;
}

function getLinRodnitzkyData () {
  // CPA all keywords / CPA conv kewyords
  var getLinRodnitzkyData = [];
  var conversions = 0;
  var cost = 0;
  var costConvertedKeywords = 0;
  
  var campaignCostConversionData = AdWordsApp.report(
    "SELECT Cost, Conversions " +
    "FROM CAMPAIGN_PERFORMANCE_REPORT " +
    "WHERE AdvertisingChannelType = SEARCH " +
    "DURING LAST_30_DAYS ");
  
  var keywordCostConversionData = AdWordsApp.report(
    "SELECT Cost " +
    "FROM KEYWORDS_PERFORMANCE_REPORT " +
    "WHERE Conversions > 0 " +
    "DURING LAST_30_DAYS ");
  
  var campaignRows = campaignCostConversionData.rows();
  var keywordRows = keywordCostConversionData.rows();
  
  while (campaignRows.hasNext()) {
    var campaign = campaignRows.next();
    var campaignConversions = campaign['Conversions'];
    var campaignCost = campaign['Cost'];
    
    conversions += parseFloat(campaignConversions);
    cost += parseFloat(campaignCost);
  }
  
  while (keywordRows.hasNext()) {
    var keyword = keywordRows.next();
    var keywordCost = keyword['Cost'];
    
    costConvertedKeywords += parseFloat(keywordCost);
  }
  
  var lRRatio = (cost / conversions) / (costConvertedKeywords / conversions);
  var lRFixed = lRRatio.toFixed(2);
  var lRInterpretation = '';
  
  if (lRRatio < 1.5) {
    lRInterpretation = lRFixed + ' (conservative bidding)';
  } else if (lRRatio < 2) {
    lRInterpretation = lRFixed + ' (well balanced)';
  } else if (lRRatio < 2.5) {
    lRInterpretation = lRFixed + ' (few converting keywords)';
  } else if (lRRatio >= 2.5) {
    lRInterpretation = lRFixed + ' (poor bidding)';
  } else {
    Logger.log('Lin Rodnitzky error')
  }
    
  getLinRodnitzkyData.push(['Lin Rodnitzky Ratio', lRInterpretation]);
  
  return getLinRodnitzkyData;
}

function addToOverview (allData) {
  var overviewSheetData = [];
  var currentRow = 1;

  for (var typeIndex = 0; typeIndex < allData.length; typeIndex++) {
    var dataType = allData[typeIndex];

    for (var i = 0; i < dataType.length; i++) {
      var dataRow = dataType[i];
      overviewSheetData.push([dataRow[0], dataRow[1]]);
    }
	
    overviewSheetData.push([' ', ' ']);
  }

  var activeSheet = spreadsheet.getActiveSheet();
  var range = activeSheet.getRange('A1:B' + overviewSheetData.length);
  range.setValues(overviewSheetData);
}

function addDataToSheet (allData) {
  var sheetData = [];
  
  var activeSheet = spreadsheet.getActiveSheet();
  var lastRow = activeSheet.getLastRow();
  var rowCounter = lastRow + 2;
  
  for (var typeIndex = 0; typeIndex < allData.length; typeIndex++) {
    var dataType = allData[typeIndex]; // e.g. adGroupData
    var typeData = [];

    for (var i = 0; i < dataType.length; i++) {
      var dataRow = dataType[i];
      var hasData = dataRow[2];
      if (hasData) {
         // e.g. ['capitals', '1/10', [array]]
        var dataName = dataRow[0];
        var dataTitle = [dataName, ' ', ' '];
        var dataHeader = ['Campaign', 'AdGroup', '(keyword)'];
        var spacing = [' ', ' ', ' '];
        var resultsData = dataRow[2];

        typeData.push(dataTitle);
        typeData.push(dataHeader);
        typeData = typeData.concat(resultsData);
        typeData.push(spacing);
      }
    }
    sheetData = sheetData.concat(typeData);
  }
  Logger.log(sheetData);
  
  Logger.log(' ');
  Logger.log('sheetData length: ' + sheetData.length);
  
  var end = rowCounter + sheetData.length - 1;
  Logger.log('end: ' + end);
  var rangeText = 'A' + rowCounter + ':C' + end;
  Logger.log('rangetext: ' + rangeText);
  var range = activeSheet.getRange(rangeText);
  range.setValues(sheetData);
}

function resetSheet () {
  var activeSheet = spreadsheet.getActiveSheet();
  var lastRow = parseFloat(activeSheet.getLastRow()) + 1;

  var range = activeSheet.getRange('A1:C' + lastRow);
  range.clearContent();
}

function createAverageFromRange(stringRange) {
  var activeSheet = spreadsheet.getActiveSheet();
  var range = activeSheet.getRange(stringRange);
  var cellValues = range.getValues();
  
  var sum = 0;
  var counter = 0;
  
  for (var i = 0; i < cellValues.length; i++) {
    var cellValue = cellValues[i][0];
    if (typeof(cellValue) == 'number') {
      Logger.log(cellValue);
      sum += cellValue;
      counter++;
    }
  }
  var average = sum / counter;
  return average;
}
