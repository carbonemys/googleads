/*
  true = good
  
  - no template required (fill in Name @ a6)
  - tab name should be data_raw
  
  todo:
  delete every label row before beginning
  todo ecpc and bidmodifier (needs awql)
*/

var config = {
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1UbElU-vcEHTOkfYKKLony46f45jHBv-5KivWZA2ckZY/edit#gid=0',
  accountLabel: 'JW',
  rawTabName: 'data_raw',
  firstDataRow: 7,
  firstDataColumn: 1,
  columnNames: [[
    'Name',
    'Id',
    'Label',
    'dateText',
    '//Totalscore',
    'hasAttributionModeling',
    'budgetNoLostImpressionShare',
    'hasNoLowQscoreKeywords',
    'hasNoLowEtaAdgroups',
    'hasNoMixedMatchtypes',
    'hasNoMissingHeadline3',
    'hasNoSta',
    'remarketing',
    'inMarket',
    'deviceBidding',
    '4+highlights',
    '4+sitelinks',
    'snippets',
    'Good Lin Rodnitzky',
    'hasNoEcpcAndBidmodifier'
  ]]
}

var spreadsheet = SpreadsheetApp.openByUrl(config.spreadsheetUrl)

function main() {
  Logger.log('Start accountScore script')
  
  // create rows with ids and run script per account
  // try {
    var accountSelector = AdsManagerApp
      .accounts()
      .withCondition("LabelNames CONTAINS '" + config.accountLabel + "'")

    var accountNames = []

    var accountIterator = accountSelector.get()
    while (accountIterator.hasNext()) {
      var account = accountIterator.next()
      var accountName = account.getName()
      var accountId = account.getCustomerId()
      accountNames.push([accountName, accountId, config.accountLabel])
    }
    // Logger.log(accountNames)
    var sheet = spreadsheet.getSheetByName(config.rawTabName)
    var firstRow = config.firstDataRow
    var lastRow = config.firstDataRow + accountNames.length - 1
    
    var sheetLastRow = sheet.getLastRow()
    
    // delete old rows with same label
    
    var labelColumn = 3
    Logger.log(config.firstDataRow + ' ' + labelColumn + ' '  + sheetLastRow + ' '  + 1)
    var range = sheet.getRange(config.firstDataRow, labelColumn, sheetLastRow, 1)
    var labelValues = range.getValues()
    var offset = -1
    for (i = 0; i < labelValues.length; i++) {
      if (labelValues[i] == config.accountLabel) {
        sheet.deleteRow(config.firstDataRow + i + 1 + offset)
        offset--
      }
    }

  	// last row after deletes
    var sheetLastRow = sheet.getLastRow()
    
    // add names
    // var range = sheet.getRange('A' + firstRow + ':C' + lastRow)
    Logger.log(sheetLastRow + accountNames.length)
    var range = sheet.getRange(sheetLastRow + 1, 1, accountNames.length, 3)
    range.setValues(accountNames)
    
    // apply header names
  	var range = sheet.getRange(config.firstDataRow - 1, 1, 1, config.columnNames[0].length)
    range.setValues(config.columnNames)
    
    MccApp
      .accounts()
      .withCondition("LabelNames CONTAINS '" + config.accountLabel + "'")
      .executeInParallel('scoreAccount')
  //} catch(err) {
  //  Logger.log('Error: ' + err)
    // account level run or error
  //} 
}

function scoreAccount() {
  // Create scores in a SINGLE row multidimensional array
  // Make a total score (percentage ?)
  // Then apply them to the corresponding row

  var scores = []

  var dateToday = new Date();
  var dateText = Utilities.formatDate(dateToday, 'Europe/Amsterdam', 'yyyy-MM-dd');
  
  var accountData = getAccountData()
  var keywordData = getKeywordData()
  var adGroupData = getAdGroupData()
  var campaignData = getCampaignData()
  var extensionData = getExtensionData()
  var campaignAwqlData = getCampaignAwqlData()
  var adData = getAdData()
  
  scores.push([dateText],
    ['//Totalscore'],
    [accountData.hasAttributionModeling],
    [accountData.hasNoBudgetLostImpressionShare],
    [keywordData.hasNoLowQscoreKeywords],
    [adGroupData.hasNoLowEtaAdgroups],
    [adGroupData.hasNoMixedMatchtypes],
    [adData.hasNoMissingHeadline3],
    [adData.hasNoSta],
    [campaignData.remarketing],
    [campaignData.inMarket],
    [campaignData.deviceBidding],
    [campaignData.has4Highlights || extensionData.has4Highlights],
    [campaignData.has4Sitelinks || extensionData.has4Sitelinks],
    [campaignData.snippets || extensionData.hasSnippets],
    [campaignAwqlData.LRwellBalanced],
    [campaignAwqlData.hasNoEcpcAndModifier]
   )
  
  var totalScore = makeTotalScore(scores)
  scores[1] = totalScore

  scoresToSheet(scores)
}

function makeTotalScore(scores) {
  var totalScoresCount = 0
  var totalGoodScores = 0
  // skip column 1 and 2 (0 and 1)
  for (i = 2; i < scores.length; i++) {
    totalScoresCount++
    if (scores[i][0]) {
      totalGoodScores++
    }
  }
  var percentageScore = totalGoodScores / totalScoresCount
  return percentageScore
}

function getAccountRow() {
  // Returns row index (e.g. account on A10 returns 10)
  var accountId = AdsApp.currentAccount().getCustomerId()
  var sheet = spreadsheet.getSheetByName(config.rawTabName)
  var firstCheckRow = config.firstDataRow
  var currentRows = sheet.getLastRow() + 1 - config.firstDataRow
  //var maxAccounts = 1000
  var lastCheckRow = config.firstDataRow + currentRows
  var checkRange = sheet.getRange(firstCheckRow, 2, lastCheckRow, 1)
  var checkRangeValues = checkRange.getValues()
  
  var accountRow
  
  for (i = 0; i < currentRows; i++) {
    if (checkRangeValues[i][0] == accountId) {
      accountRow = i + firstCheckRow
    }
  }
  return accountRow
}

function getCampaignAwqlData () {
  // CPA all keywords / CPA conv kewyords
  var linRodnitzkyData = []
  var campaignAwqlScores = {
    LRwellBalanced: false,
    hasNoEcpcAndModifier: true
  }
  var conversions = 0
  var cost = 0
  var costConvertedKeywords = 0
  
  var campaignCostConversionData = AdsApp.report(
    "SELECT Cost, Conversions, EnhancedCpcEnabled, CampaignId " +
    "FROM CAMPAIGN_PERFORMANCE_REPORT " +
    "WHERE AdvertisingChannelType = SEARCH " +
    "AND CampaignStatus = ENABLED " +
    "DURING LAST_30_DAYS ")
  
  var keywordCostConversionData = AdsApp.report(
    "SELECT Cost " +
    "FROM KEYWORDS_PERFORMANCE_REPORT " +
    "WHERE Conversions > 0 " +
    "DURING LAST_30_DAYS ")
  
  var campaignRows = campaignCostConversionData.rows()
  var keywordRows = keywordCostConversionData.rows()
  
  while (campaignRows.hasNext()) {
    var campaign = campaignRows.next()
    var campaignConversions = campaign['Conversions']
    var campaignCost = campaign['Cost']
    var ecpcEnabled = campaign['EnhancedCpcEnabled']
    var campaignId = campaign['CampaignId']
    
    conversions += parseFloat(campaignConversions)
    cost += parseFloat(campaignCost)
    
    if (ecpcEnabled) {
      var bidIterator = AdsApp.campaigns()
        .withCondition("CampaignId = '" + campaignId + "'")
        .get()
      
      if (bidIterator.hasNext()) {
        var campaignAdienceIterator = bidIterator.next().targeting().audiences().get()
        while (campaignAdienceIterator.hasNext()) {
          var audience = campaignAdienceIterator.next()
          var bidModifier = audience.bidding().getBidModifier()
          // Logger.log(campaignId)
          // Logger.log(bidModifier)
          // Logger.log(bidModifier * 2)
          if (bidModifier != 1) {
            campaignAwqlScores.hasNoEcpcAndModifier = false
          }
        }
      }
    }
  }
  
  while (keywordRows.hasNext()) {
    var keyword = keywordRows.next()
    var keywordCost = keyword['Cost']
    
    costConvertedKeywords += parseFloat(keywordCost)
  }
  
  var lRRatio = (cost / conversions) / (costConvertedKeywords / conversions)
  var lRFixed = lRRatio.toFixed(2)
  var lRInterpretation = ''
  
  if (lRRatio < 1.5) {
    lRInterpretation = lRFixed + ' (conservative bidding)'
  } else if (lRRatio < 2) {
    lRInterpretation = lRFixed + ' (well balanced)'
    campaignAwqlScores.LRwellBalanced = true
  } else if (lRRatio < 2.5) {
    lRInterpretation = lRFixed + ' (few converting keywords)'
  } else if (lRRatio >= 2.5) {
    lRInterpretation = lRFixed + ' (poor bidding)'
  } else {
    lRInterpretation = 'no conversion data'
  }

  return campaignAwqlScores
}

function scoresToSheet(scores) {
  var accountRow = getAccountRow()
  var sheet = spreadsheet.getSheetByName(config.rawTabName)
  var numberOfScores = scores.length
  // Logger.log(accountRow)
  var range = sheet.getRange(accountRow, 4, 1, numberOfScores)
  range.setValues([scores])
}

function getAccountData () {
  var accountScores = {
    hasAttributionModeling: false,
    hasNoBudgetLostImpressionShare: false
  }
  var accountData = []
  var hasAttributionModeling = 'No'
  var budgetLostImpressionShare = ''
  
  // account performance data
  var accountPerfData = AdsApp.report(
    "SELECT SearchBudgetLostImpressionShare " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    " DURING LAST_7_DAYS ");
  
  var rows = accountPerfData.rows()
  while (rows.hasNext()) { // there is just one row
    var row = rows.next()
    budgetLostImpressionShare = row['SearchBudgetLostImpressionShare']
    if (budgetLostImpressionShare === '0.00%') {
      accountScores.hasNoBudgetLostImpressionShare = true
    }
  }
  
  // account conversion for attributino modeling
  var accountConversionData = AdsApp.report(
    "SELECT Conversions " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    " DURING LAST_30_DAYS ")

  var rows = accountConversionData.rows()
  var totalConversions = 0
  while (rows.hasNext()) {
    var row = rows.next()
    totalConversions++
    var numberOfConversions = parseFloat(row['Conversions'])
    if (numberOfConversions % 1 != 0) {
      hasAttributionModelling = 'Yes'
      accountScores.hasAttributionModeling = true
    }
  }
  
  accountData.push([hasAttributionModeling], [budgetLostImpressionShare])
  return accountScores
}

function getKeywordData() {
  var keywordData = []
  var keywordScores = {
    hasNoLowQscoreKeywords: false
  }
  var lowQscoreCount = 0
  
  var keywordsIterator = AdWordsApp.keywords()
  .withCondition('CampaignStatus = ENABLED')
  .withCondition('AdGroupStatus = ENABLED')
  .withCondition('Status = ENABLED')
  .get()

  while (keywordsIterator.hasNext()) {
    var keyword = keywordsIterator.next()
    var qscore = keyword.getQualityScore()
    
    // low qscore check
    var minQscore = 4
    if (qscore !== null && parseFloat(qscore) < minQscore) {
      lowQscoreCount++
      keywordScores.hasNoLowQscoreKeywords = true
    }
  }
  return keywordScores
}

function getAdGroupData () {
  var adGroupData = []
  var adGroupScores = {
    hasNoLowEtaAdgroups: true,
    hasNoMixedMatchtypes: true
  }
  
  var adGroupEtaData = []
  var adGroupMixedMatchTypesData = []
  
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('Status = ENABLED')
    .withCondition("AdvertisingChannelType = SEARCH")
    .get();
  
  var totalAdGroups = adGroupIterator.totalNumEntities();
  
  // number of standard text ads
  while (adGroupIterator.hasNext()) {
  	var adGroup = adGroupIterator.next()
    var adGroupName = adGroup.getName()
    var campaignName = adGroup.getCampaign().getName()
  
    // three or more ETA's
    var EtaIterator = adGroup.ads()
      .withCondition('Status = ENABLED')
   	  .withCondition('Type = EXPANDED_TEXT_AD')
      .get()

    if (EtaIterator.totalNumEntities() < 3) {
      adGroupEtaData.push([campaignName, adGroupName, ' '])
      adGroupScores.hasNoLowEtaAdgroups = false
    }

    // mixed match types
    var matchTypeIterator = adGroup.keywords()
      .withCondition('Status = ENABLED')
      .get()
    
    if (matchTypeIterator.hasNext()) {
      var firstMatchType = matchTypeIterator.next().getMatchType()
    }
    
    var found = false
    while (matchTypeIterator.hasNext()) {
      var keyword = matchTypeIterator.next()
      var matchType = keyword.getMatchType()
      
      if (matchType !== firstMatchType && !found) {
        adGroupMixedMatchTypesData.push([campaignName, adGroupName, ' '])
        found = true;
        adGroupScores.hasMixedMatchtypes = false
      }
    }
  }

  var adGroupLowEtaCount = adGroupEtaData.length
  var adGroupMixedMatchTypesCount = adGroupMixedMatchTypesData.length

  return adGroupScores
}

function getAdData () {
  var adData = []
  var adScores = {
    hasNoSta: true,
    hasNoMissingHeadline3: true
  }
  
  var adStaData = false
  var adHeadline3Data = true
  
  var staIterator = AdsApp.ads()
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('AdGroupStatus = ENABLED')
    .withCondition('Status = ENABLED')
    .withCondition('Type = TEXT_AD')
    .get()
  
  // just check if there is a first
  if (staIterator.hasNext()) {
    adStaData = true
    adScores.hasNoSta = false
  }
  
  var etaIterator = AdsApp.ads()
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('AdGroupStatus = ENABLED')
    .withCondition('Status = ENABLED')
    .withCondition('Type = EXPANDED_TEXT_AD')
    .get()
  
  while (etaIterator.hasNext() && adHeadline3Data === true) {
    var eta = etaIterator.next()
    var headline3 = eta.asType().expandedTextAd().getHeadlinePart3()
    if (headline3 === null) {
      adHeadline3Data = false
      adScores.hasNoMissingHeadline3 = false
    }
  }
  
  return adScores
}

function getExtensionData () {
  var extensionScores = {
    has4Highlights: false,
    has4Sitelinks: false,
    hasSnippets: false
  }
  
  var highlightIterator = AdWordsApp.currentAccount().extensions().callouts().get()
  if (highlightIterator.totalNumEntities() >= 4) {
    extensionScores.has4Highlights = true
  }
  
  var sitelinkIterator = AdWordsApp.currentAccount().extensions().sitelinks().get()
  //Logger.log(AdsApp.currentAccount().getName())
  //Logger.log(sitelinkIterator.totalNumEntities())
  //Logger.log(sitelinkIterator.totalNumEntities() > 0)
  if (sitelinkIterator.totalNumEntities() >= 4) {
    extensionScores.has4Sitelinks = true
  }
  
  var snippetIterator = AdWordsApp.currentAccount().extensions().snippets().get()
  if (snippetIterator.totalNumEntities() > 0) {
    extensionScores.hasSnippets = true
  }
  
  return extensionScores
}

function getCampaignData () {
  var campaignScores = {
    remarketing: false,
    inMarket: false,
    has4Sitelinks: true,
    snippets: true,
    has4Highlights: true,
    deviceBidding: false
  }
  
  var sitelinkData = [];
  var highlightData = [];
  var snippetData = [];
  var rlsaData = [];
  var deviceData = [];
  
  // bidding variables
  var manualData = [];
  var conversionOptimizerData = [];
  
  var campaignIterator = AdWordsApp.campaigns()
    .withCondition('Status = ENABLED')
    .withCondition('AdvertisingChannelType = SEARCH')
    .get();
  
  var totalCampaigns = campaignIterator.totalNumEntities();
  
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var campaignName = campaign.getName();
    var stats = campaign.getStatsFor('LAST_30_DAYS');
    
    // check for less than 4 sitelinks
    var sitelinkIterator = campaign.extensions().sitelinks().get()
    if (sitelinkIterator.totalNumEntities() < 4) {
      campaignScores.has4Sitelinks = false
    }
    
    // check for less than 4 highlights
    var highlightIterator = campaign.extensions().callouts().get()
    if (highlightIterator.totalNumEntities() < 4) {
      campaignScores.has4Highlights = false
    }
    
    // check for has no snippets
    var snippetIterator = campaign.extensions().snippets().get()
    if (snippetIterator.totalNumEntities() === 0) {
      campaignScores.snippets = false
    }
    
    // check for audiences
    var audienceIterator = campaign.targeting().audiences().get()
    while (audienceIterator.hasNext()) {
      var audience = audienceIterator.next()
      var audienceType = audience.getAudienceType()
      if (audienceType === 'USER_LIST') {
        campaignScores.remarketing = true
      } else if (audienceType === 'USER_INTEREST') {
        campaignScores.inMarket = true
      }
    }
    
    // check for device settings
    var deviceIterator = campaign.targeting().platforms().mobile().get().next()
    if (deviceIterator.getBidModifier() !== 1) {
      campaignScores.deviceBidding = true
    }

  }

  return campaignScores
}
