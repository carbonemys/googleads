/*
 Script by: Bas Baudoin 🦆
 - template sheet is MANDATORY
 - script works on mcc ONLY
 - modify label and url before use
 - use most recent template (!)
 
 v2.01 template - creates tab with account name or optional custom tab name
 copy template: https://docs.google.com/spreadsheets/d/1EWXH-s_Nr_8u2VsD1C7zum_bIrsE2s3qbJvZQdBF9Kw/copy
 
 v2019
 - remove individual keyword/adgroup data in sheet
 - standard javascript notation
 - app extension account
 - weekday conversions
 - hourday conversions
 - inMarket account
 - hasStoreVisits (testen)
 - mobile & tablet adjustments
 - has YouTube views (gekoppeld of gekoppeld geweest)
 - roas and ecpc
 - adGroup extension check
 - keywords per quality score
 - adgroups met RSA
 - 3rd headline
 v2.01
 - efficiency and refactoring
 - tablet added
 - date function
 - fix template color validation
 - disable adgroup function option
  - cost per conversion instead of conversions weekday/hour

 todo
 - bid adjustment desktop in campaigndata

 limitations
 - prijs, promotie en locatie not via standard
 - translation
 - placements headers

*/

// ** settings **
var spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1_jZWbcktLb_Tmh1pn5UPldbYMBHh4sfR0X9z1vLp3tE/edit#gid=0'
var accountLabel = 'Active'
var runAdGroupFunction = true // set false if script times out

// ** date **
var dayA = 91
var dayB = 1
var dateA = getDateByDaysAgo(dayA)
var dateB = getDateByDaysAgo(dayB)
var dateRange = dateA + ',' + dateB

// ** globals, do not change **
var spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl)



function main () {
  Logger.log(dateRange)
  try {
    MccApp
      .accounts()
      .withCondition("LabelNames CONTAINS '" + accountLabel + "'")
      .executeInParallel('createHI')
  } catch (e) {
    createHI()
  }
}

function createHI () {
  var activeSheetAndRanToday = findAndClearSheet()
  var activeSheet = activeSheetAndRanToday[0]
  var ranToday = activeSheetAndRanToday[1]
  
  Logger.log(ranToday)
  if (ranToday) {
    return
  }
  
  // get functions have return array => [name, displayValue (, data for separate sheet)]
  //   data for separate sheet struture [[campaign, adgroup(, keyword)], [...
  
  var accountData = getAccountData()
  var deviceData = getDeviceData()
  var LinRodnitzkyData = getLinRodnitzkyData()
  var keywordData = getKeywordData()
  var adGroupData = getAdGroupData()
  var campaignData = getCampaignData()
  var campaignGaqlData = getCampaignGaqlData()
  var extensionData = getExtensionData()
  var shoppingData = getShoppingData()
  var weekdayData = getWeekdayData()
  var hourOfDayData = getHourOfDayData()
  var videoData = getVideoData()
  var adData = getAdData()
  
  var allDataOverview = [
    accountData,
    deviceData,
    LinRodnitzkyData,
    keywordData,
    adGroupData,
    adData,
    campaignData,
    campaignGaqlData,
    extensionData,
    shoppingData,
    videoData,
    weekdayData,
    hourOfDayData
  ]

  addToOverview(allDataOverview, activeSheet)
  addDate(activeSheet)
}

function getDeviceData () {
  Logger.log('Start function devicedata')
  var deviceData = []
  
  var mobileCost = 0
  var desktopCost = 0
  var tabletCost = 0
  var mobileConversions = 0
  var desktopConversions = 0
  var tabletConversions = 0
  var mobileCostPerConversion = 0
  var desktopCostPerConversion = 0
  var tabletCostPerConversion = 0
  var mobileConversionRate = 0
  var desktopConversionRate = 0
  var tabletConversionRate = 0
  
  var deviceReport = AdWordsApp.report(
    "SELECT Device, Cost, Conversions, CostPerConversion, ConversionRate, Impressions " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    "DURING " + dateRange)
  
  var rows = deviceReport.rows()
  while (rows.hasNext()) {
    var row = rows.next()
    var device = row['Device']
    var cost = row['Cost']
    var conversions = row['Conversions']
    var costPerConversion = row['CostPerConversion']
    var conversionRate = row['ConversionRate']

    if (device == 'Computers') {
      desktopCost = cost
      desktopConversions = conversions
      desktopCostPerConversion = costPerConversion
      desktopConversionRate = conversionRate
    } else if (device == 'Mobile devices with full browsers') {
      mobileCost = cost
      mobileConversions = conversions
      mobileCostPerConversion = costPerConversion
      mobileConversionRate = conversionRate
    } else if (device == 'Tablets with full browsers') {
      tabletCost = cost
      tabletConversions = conversions
      tabletCostPerConversion = costPerConversion
      tabletConversionRate = conversionRate
    }
  }
  
  deviceData.push(['Device data (' + dateRange + ')', ''])
  deviceData.push(['Cost', 'm: ' + mobileCost + ' - d: ' + desktopCost + ' - t: ' + tabletCost])
  deviceData.push(['Conversions', 'm: ' + mobileConversions + ' - d: ' + desktopConversions + ' - t: ' + tabletConversions])
  deviceData.push(['Cost per conversion', 'm: ' + mobileCostPerConversion + ' - d: ' + desktopCostPerConversion + ' - t: ' + tabletCostPerConversion])
  deviceData.push(['Conversion rate', 'm: ' + mobileConversionRate + ' - d: ' + desktopConversionRate + ' - t: ' + desktopConversionRate])
  
  return deviceData
}

function getAccountData () {
  Logger.log('Start function accountdata')
  var accountData = []

  var accountName = AdWordsApp.currentAccount().getName()
  var accountId = AdWordsApp.currentAccount().getCustomerId()
  var hasConversions = 'No'
  var budgetLostImpShare = ''
  var rankLostImpShare = ''
  var totalConversions = 0
  var gadsConversions = 0
  var analyticsConversions = 0
  var hasAttributionModelling = 'No'
  var hasStoreVisits = 'No'
  
  // check for conversions in last 30 days (not used?)
  var accountConversions = parseFloat(AdWordsApp.currentAccount().getStatsFor('LAST_30_DAYS').getConversions())
  if (accountConversions > 0) {
    hasConversions = 'Yes'
  }
  
  // account performance data
  var accountPerfData = AdWordsApp.report(
    "SELECT SearchBudgetLostImpressionShare, SearchRankLostImpressionShare " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    " DURING LAST_7_DAYS ")
  
  var rows = accountPerfData.rows()
  while (rows.hasNext()) { // there is just one row
    var row = rows.next()
    budgetLostImpShare = row['SearchBudgetLostImpressionShare']
    rankLostImpShare = row['SearchRankLostImpressionShare']
  }
  
  // account conversion
  var accountConversionData = AdWordsApp.report(
    "SELECT Conversions, ConversionCategoryName, ConversionTypeName, ExternalConversionSource " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    " DURING " + dateRange)
  
  
  var rows = accountConversionData.rows()
  while (rows.hasNext()) {
    var row = rows.next()
    totalConversions++
    var numberOfConversions = parseFloat(row['Conversions'])
    if (numberOfConversions % 1 != 0) {
      hasAttributionModelling = 'Yes'
    }
    var conversionSource = row['ExternalConversionSource']
    if (conversionSource == 'Analytics') {
      analyticsConversions++
    } else if (conversionSource === 'Website') {
      gadsConversions++
    } else if (conversionSource === 'Store visits') {
      hasStoreVisits = 'Yes'
    }
  }
  
  accountData.push(['', '', ''])
  accountData.push(['Account information', ''])
  accountData.push(['Account name', accountName])
  accountData.push(['Accound id', accountId])
  accountData.push(['Lost impressions (budget)', budgetLostImpShare])
  accountData.push(['Lost impressions (rank/cpc)', rankLostImpShare])

  accountData.push(['', '', ''])
  accountData.push(['Conversion tracking', '', ''])
  accountData.push(['Google Ads conversions', gadsConversions + '/' + totalConversions])
  accountData.push(['Analytics conversions', analyticsConversions + '/' + totalConversions])
  accountData.push(['Google store visits', hasStoreVisits])
  accountData.push(['Has attribution model (non-last-click)', hasAttributionModelling])
  
  return accountData
}

function getKeywordData () {
  Logger.log('start function keyworddata')
  var keywordData = []
  
  var totalKeywords = 0
  var capitalLetterWords = 0
  var punctuationMarkWords = 0
  var qscoreCount = {
    'na': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
    '6': 0,
    '7': 0,
    '8': 0,
    '9': 0,
    '10': 0
  }

  var keywordsIterator = AdWordsApp.keywords()
  .withCondition('CampaignStatus = ENABLED')
  .withCondition('AdGroupStatus = ENABLED')
  .withCondition('Status = ENABLED')
  .get()
  
  var totalKeywords = keywordsIterator.totalNumEntities()

  // loops through all enabled keywords
  while (keywordsIterator.hasNext()) {
    var keyword = keywordsIterator.next()
    var keywordText = keyword.getText()
    var campaign = keyword.getCampaign().getName()
    var adGroup = keyword.getAdGroup().getName()
    var qscore = keyword.getQualityScore()
    
    // hoofdletter check
    if (keywordText.toLowerCase() !== keywordText) {
      capitalLetterWords++
    }
    
    // punctuation check (only allowed google ads characters)
    if (keywordText.replace('-') !== keywordText || keywordText.replace('/') !== keywordText || keywordText.replace('.') !== keywordText || keywordText.replace('.') !== keywordText || keywordText.replace('&') !== keywordText) {
      punctuationMarkWords++
    }
    
    // low qscore check
    if (qscore == null) {
      qscoreCount.na++
    } else {
      qscoreCount[qscore]++
    }
  }
  
  Logger.log(qscoreCount)
  
  keywordData.push(['Keyword data', ''])
  keywordData.push(['Capital letters', capitalLetterWords + '/' + totalKeywords, capitalLetterWords])
  keywordData.push(['Punctuation marks', punctuationMarkWords + '/' + totalKeywords, punctuationMarkWords])
  keywordData.push(['', ''])
  keywordData.push(['Qscore data', ''])
  keywordData.push(['n/a', qscoreCount.na])
  keywordData.push(['1', qscoreCount['1']])
  keywordData.push(['2', qscoreCount['2']])
  keywordData.push(['3', qscoreCount['3']])
  keywordData.push(['4', qscoreCount['4']])
  keywordData.push(['5', qscoreCount['5']])
  keywordData.push(['6', qscoreCount['6']])
  keywordData.push(['7', qscoreCount['7']])
  keywordData.push(['8', qscoreCount['8']])
  keywordData.push(['9', qscoreCount['9']])
  keywordData.push(['10', qscoreCount['10']])
  
  return keywordData
}

function getAdGroupData () {
  Logger.log('Start function adgroupdata')
  var adGroupData = []
  
  var adGroupStaData = 0
  var adGroupEtaData = 0
  var adGroupMixedMatchTypesData = 0
  var lessThanTwoEtaAdGroups = 0
  var rsaAdGroups = 0
  
  var sitelinkAdGroups = 0
  var highlightAdGroups = 0
  var snippetAdGroups = 0
  var phoneAdGroups = 0

  if (runAdGroupFunction) { // set FALSE if script times out
    
    var adGroupIterator = AdWordsApp.adGroups()
      .withCondition('CampaignStatus = ENABLED')
      .withCondition('Status = ENABLED')
      .withCondition("AdvertisingChannelType = SEARCH")
      .get()
    
    var totalAdGroups = adGroupIterator.totalNumEntities()
    
    // number of standard text ads
    while (adGroupIterator.hasNext()) {
      var adGroup = adGroupIterator.next()
      var adGroupName = adGroup.getName()
      var campaignName = adGroup.getCampaign().getName()
      
      var staIterator = adGroup.ads()
        .withCondition('Status = ENABLED')
        .withCondition('Type = TEXT_AD')
        .get()
      
      if (staIterator.totalNumEntities() > 0) {
        adGroupStaData++
      } 
    
      // three or more ETA's
      var EtaIterator = adGroup.ads()
        .withCondition('Status = ENABLED')
        .withCondition('Type = EXPANDED_TEXT_AD')
        .get()

      if (EtaIterator.totalNumEntities() < 3) {
        adGroupEtaData++
      } else if (EtaIterator.totalNumEntities() < 2) {
        lessThanTwoEtaAdGroups++
      }
      
      // versatile (RSA) ads
      var rsaIterator = adGroup.ads()
        .withCondition('Status = ENABLED')
        .withCondition('Type = VERSATILE_TEXT_AD')
        .get()

      if (rsaIterator.totalNumEntities() < 1) {
        rsaAdGroups++
      }

      // mixed match types
      var matchTypeIterator = adGroup.keywords()
        .withCondition('Status = ENABLED')
        .get()
      
      if (matchTypeIterator.hasNext()) {
        var firstMatchType = matchTypeIterator.next().getMatchType()
      }
      
      // check adgroup extensions
      var sitelinkIterator = adGroup.extensions().sitelinks().get()
      if (sitelinkIterator.hasNext()) {
        sitelinkAdGroups++
      }
      var highlightIterator = adGroup.extensions().callouts().get()
      if (highlightIterator.hasNext()) {
        highlightAdGroups++
      }
      var snippetIterator = adGroup.extensions().snippets().get()
      if (snippetIterator.hasNext()) {
        snippetAdGroups++
      }
      var phoneIterator = adGroup.extensions().phoneNumbers().get()
      if (phoneIterator.hasNext()) {
        phoneAdGroups++
      }
      
      var found = false
      while (matchTypeIterator.hasNext()) {
        var keyword = matchTypeIterator.next()
        var matchType = keyword.getMatchType()
        
        if (matchType !== firstMatchType && !found) {
          adGroupMixedMatchTypesData++
          found = true
        }
      }
      
    } // end adgroupiterator
    
    adGroupData.push(['AdGroup data', ''])
    adGroupData.push(['Adgroups with standard Text Ads', adGroupStaData + '/' + totalAdGroups, adGroupStaData])
    adGroupData.push(['Adgroups with less than 3 ETAs', adGroupEtaData + '/' + totalAdGroups, adGroupEtaData])
    adGroupData.push(['Adgroups with less than 2 ETAs', lessThanTwoEtaAdGroups + '/' + totalAdGroups, adGroupEtaData])
    adGroupData.push(['Adgroups with no RSAs', rsaAdGroups + '/' + totalAdGroups])
    adGroupData.push(['Adgroups with mixed match types', adGroupMixedMatchTypesData + '/' + totalAdGroups, adGroupMixedMatchTypesData])
    adGroupData.push(['', ''])
    adGroupData.push(['AdGroup extensions', ''])
    adGroupData.push(['AdGroup sitelinks', sitelinkAdGroups + '/' + totalAdGroups])
    adGroupData.push(['AdGroup highlights', highlightAdGroups + '/' + totalAdGroups])
    adGroupData.push(['AdGroup snippets', snippetAdGroups + '/' + totalAdGroups])
    adGroupData.push(['AdGroup phone ext.', phoneAdGroups + '/' + totalAdGroups])
  } else {
    adGroupData.push(['AdGroup data', ''])
    adGroupData.push(['Adgroups with standard Text Ads', 'disabled'])
    adGroupData.push(['Adgroups with less than 3 ETAs', 'disabled'])
    adGroupData.push(['Adgroups with less than 2 ETAs', 'disabled'])
    adGroupData.push(['Adgroups with no RSAs', 'disabled'])
    adGroupData.push(['Adgroups with mixed match types', 'disabled'])
    adGroupData.push(['', ''])
    adGroupData.push(['AdGroup extensions', ''])
    adGroupData.push(['AdGroup sitelinks', 'disabled'])
    adGroupData.push(['AdGroup highlights', 'disabled'])
    adGroupData.push(['AdGroup snippets', 'disabled'])
    adGroupData.push(['AdGroup phone ext.', 'disabled'])
  }

  return adGroupData
}

function getCampaignData () {
  Logger.log('Start function campaigndata')
  var campaignData = []
  
  var hasAnalyticsViews = 'No'
  var sitelinkData = 0
  var highlightData = 0
  var snippetData = 0
  var callData = 0
  var appData = 0
  var rlsaData = 0
  var inMarketData = 0
  var adScheduleData = 0
  var experimentData = 0
  var rotationData = 0
  var negativeKeywordListData = 0
  var deviceData = 0
  var tabletData = 0
  
  // bidding variables
  var manualData = 0
  var conversionOptimizerData = 0
  var cpaData = 0
  
  var campaignIterator = AdsApp.campaigns()
    .withCondition('Status = ENABLED')
    .withCondition('AdvertisingChannelType = SEARCH')
    .get()
  
  var totalCampaigns = campaignIterator.totalNumEntities()
  
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next()
    var campaignName = campaign.getName()
    var stats = campaign.getStatsFor('LAST_30_DAYS')
    
    // check for analytics data
    // parsefloat is for when it's not a number ?
    var campaignAnalyticsViews = parseFloat(stats.getAveragePageviews())
    if (campaignAnalyticsViews > 0) hasAnalyticsViews = 'Yes'
    
    // check for less than 4 sitelinks
    var sitelinkIterator = campaign.extensions().sitelinks().get()
    if (sitelinkIterator.totalNumEntities() < 4) {
      sitelinkData++
    }
    
    // check for less than 4 highlights
    var highlightIterator = campaign.extensions().callouts().get()
    if (highlightIterator.totalNumEntities() < 4) {
      highlightData++
    }
    
    // check for has no snippets
    var snippetIterator = campaign.extensions().snippets().get()
    if (snippetIterator.totalNumEntities() === 0) {
      snippetData++
    }
    
    // check for call extensions
    var callIterator = campaign.extensions().phoneNumbers().get()
    if (callIterator.totalNumEntities() === 0) {
      callData++
    }
    
    // check for call extensions
    var appIterator = campaign.extensions().mobileApps().get()
    if (appIterator.totalNumEntities() === 0) {
      appData++
    }
    
    // check for rlsa & in market
    var rlsaIterator = campaign.targeting().audiences().get()
    var rlsaQty = 0
    var inMarketQty = 0
    if (rlsaIterator.totalNumEntities() !== 0) {
      rlsaData++
    } else {
      while (rlsaIterator.hasNext()) {
        var audience = rlsaIterator.next()
        var audienceType = audience.getAudienceType()
        if (audienceType === 'USER_LIST') {
          rlsaQty++
        } else if (audienceType === 'USER_INTEREST') {
          inMarketQty++
        }
      }
      if (rlsaQty === 0) {
        rlsaData++
      }
      if (inMarketQty === 0) {
        inMarketData++
      }
    }

    // check for ad schedules
    var adScheduleIterator = campaign.targeting().adSchedules().get()
    if (adScheduleIterator.totalNumEntities() === 0) {
      adScheduleData++
    }
    
    // check for mobile settings
    var deviceIterator = campaign.targeting().platforms().mobile().get().next()
    if (deviceIterator.getBidModifier() != '1.0') {
      deviceData++
    }
    
    // check for tablet settings
    var tabletIterator = campaign.targeting().platforms().tablet().get().next()
    if (tabletIterator.getBidModifier() != '1.0') {
      tabletData++
    }
    
    // check for experiments
    var experimentIterator = campaign.experiments().get()
    if (experimentIterator.totalNumEntities() === 0) {
      experimentData++
    }
    
    // check for auto ad rotation
    var rotationType = campaign.getAdRotationType().toString()
    if (rotationType != 'OPTIMIZE') {
      rotationData++
    }
    
    // check for negative keyword lists
    var negativeListIterator = campaign.negativeKeywordLists().get()
    if (negativeListIterator.totalNumEntities() == 0) {
      negativeKeywordListData++
    }
    
    // BIDDING
    var biddingStrategy = campaign.getBiddingStrategyType()
    if (biddingStrategy == 'PERCENT_CPA') {
      cpaData++
    } else if (biddingStrategy == 'MANUAL_CPC') {
      manualData++
    } else if (biddingStrategy == 'CONVERSION_OPTIMIZER') {
      conversionOptimizerData++
    } else {
      Logger.log('Campaign with no bidding strategy?')
    }
  }

  campaignData.push(['Campaign data', ''])
  campaignData.push(['Analytics linked (has views)', hasAnalyticsViews])
  
  campaignData.push(['Campaigns with no RLSA', rlsaData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no In Market', inMarketData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no ad schedule', adScheduleData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no experiments', experimentData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no ad rotation', rotationData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no negative keyword list', negativeKeywordListData + '/' + totalCampaigns])
  campaignData.push(['Campaigns mobile bid adjustments', deviceData + '/' + totalCampaigns])
  campaignData.push(['Campaigns tablet bid adjustments', tabletData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with manual cpc', manualData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with target CPA', cpaData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with conversion optimizer', conversionOptimizerData + '/' + totalCampaigns])
  
  campaignData.push(['', '']) // spacing
  campaignData.push(['Campaign extensions', '']) // spacing
  campaignData.push(['Campaigns with less than 4 sitelinks', sitelinkData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with less than 4 highlights', highlightData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no snippets', snippetData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no call extensions', callData + '/' + totalCampaigns])
  campaignData.push(['Campaigns with no app extensions', appData + '/' + totalCampaigns])

  return campaignData
}

function getExtensionData () {
  Logger.log('Start function extensiondata')
  var extensionData = []
  
  var hasHighlights = 'No'
  var hasSitelinks = 'No'
  var hasSnippets = 'No'
  var hasCall = 'No'
  var hasMessage = 'No'
  var hasAppExtension = 'No'
  
  var highlightIterator = AdsApp.currentAccount().extensions().callouts().get()
  if (highlightIterator.totalNumEntities() > 0) {
    hasHighlights = 'Yes'
  }
  
  var sitelinkIterator = AdsApp.currentAccount().extensions().sitelinks().get()
  if (sitelinkIterator.totalNumEntities() > 0) {
    hasSitelinks = 'Yes'
  }
  
  var snippetIterator = AdsApp.currentAccount().extensions().snippets().get()
  if (snippetIterator.totalNumEntities() > 0) {
    hasSnippets = 'Yes'
  }
  
  var callIterator = AdsApp.currentAccount().extensions().phoneNumbers().get()
  if (callIterator.totalNumEntities() > 0) {
    hasCall = 'Yes'
  }
  
  var messageIterator = AdsApp.currentAccount().extensions().messages().get()
  if (messageIterator.totalNumEntities() > 0) {
    hasMessage = 'Yes'
  }
  
  var appIterator = AdsApp.currentAccount().extensions().mobileApps().get()
  if (appIterator.totalNumEntities() > 0) {
    hasAppExtension = 'Yes'
  }
  
  extensionData.push(['Account extension data', ''])
  extensionData.push(['Has account sitelinks', hasSitelinks])
  extensionData.push(['Has account highlights', hasHighlights])
  extensionData.push(['Has account snippets', hasSnippets])
  extensionData.push(['Has account call extensions', hasCall])
  extensionData.push(['Has account message extensions', hasMessage])
  extensionData.push(['Has account app extensions', hasAppExtension])
  
  return extensionData
}

function getShoppingData () {
  var shoppingData = []
  
  var hasShoppingProducts = 'No'
  
  var shoppingIterator = AdWordsApp.productAds().get()
  var productAdsNumber = parseFloat(shoppingIterator.totalNumEntities())
  
  if (productAdsNumber > 0) {
    hasShoppingProducts = 'Yes'
  }
  
  shoppingData.push(['Shopping data', ''])
  shoppingData.push(['Has merchants data', hasShoppingProducts])
  return shoppingData
}

function getLinRodnitzkyData () {
  // CPA all keywords / CPA conv kewyords
  var getLinRodnitzkyData = []
  var conversions = 0
  var cost = 0
  var costConvertedKeywords = 0
  
  var campaignCostConversionData = AdWordsApp.report(
    "SELECT Cost, Conversions " +
    "FROM CAMPAIGN_PERFORMANCE_REPORT " +
    "WHERE AdvertisingChannelType = SEARCH " +
    "DURING " + dateRange)
  
  var keywordCostConversionData = AdWordsApp.report(
    "SELECT Cost " +
    "FROM KEYWORDS_PERFORMANCE_REPORT " +
    "WHERE Conversions > 0 " +
    "DURING " + dateRange)
  
  var campaignRows = campaignCostConversionData.rows()
  var keywordRows = keywordCostConversionData.rows()
  
  while (campaignRows.hasNext()) {
    var campaign = campaignRows.next()
    var campaignConversions = campaign['Conversions']
    var campaignCost = campaign['Cost']
    
    conversions += parseFloat(campaignConversions)
    cost += parseFloat(campaignCost)
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
  } else if (lRRatio < 2.5) {
    lRInterpretation = lRFixed + ' (few converting keywords)'
  } else if (lRRatio >= 2.5) {
    lRInterpretation = lRFixed + ' (poor bidding)'
  } else {
    lRInterpretation = 'no conversion data'
  }
    
  getLinRodnitzkyData.push(['Lin Rodnitzky Ratio', lRInterpretation])
  
  return getLinRodnitzkyData
}

function createAverageFromRange(stringRange) {
  var activeSheet = spreadsheet.getActiveSheet()
  var range = activeSheet.getRange(stringRange)
  var cellValues = range.getValues()
  
  var sum = 0
  var counter = 0
  
  for (var i = 0; i < cellValues.length; i++) {
    var cellValue = cellValues[i][0]
    if (typeof(cellValue) == 'number') {
      Logger.log(cellValue)
      sum += cellValue
      counter++
    }
  }
  var average = sum / counter
  return average
}

function findAndClearSheet () {
  
  var accountName = AdWordsApp.currentAccount().getName()
  
  var optionalTabEntered = optionalTabName !== ''
  if (optionalTabEntered) {
    tabName = optionalTabName
  } else {
    tabName = accountName
  }
  
  var activeSheet = spreadsheet.getSheetByName(tabName)
  if (!activeSheet) {
    spreadsheet.insertSheet(tabName, 1)
    activeSheet = spreadsheet.getSheetByName(tabName)
  }
  
  var lastRow = parseFloat(activeSheet.getLastRow()) + 1

  var range = activeSheet.getRange('A1:C' + lastRow)
  range.clearContent()
  return activeSheet
}

function addToOverview (allData, activeSheet) {
  var overviewSheetData = []
  var currentRow = 1

  for (var typeIndex = 0; typeIndex < allData.length; typeIndex++) {
    var dataType = allData[typeIndex]

    for (var i = 0; i < dataType.length; i++) {
      var dataRow = dataType[i]
      overviewSheetData.push([dataRow[0], dataRow[1]])
    }
	
    overviewSheetData.push([' ', ' '])
  }

  var range = activeSheet.getRange('A1:B' + overviewSheetData.length)
  range.setValues(overviewSheetData)
}

function addDataToSheet (allData, activeSheet) {
  var sheetData = []
  
  var lastRow = activeSheet.getLastRow()
  var rowCounter = lastRow + 2
  
  for (var typeIndex = 0; typeIndex < allData.length; typeIndex++) {
    var dataType = allData[typeIndex] // e.g. adGroupData
    var typeData = []

    for (var i = 0; i < dataType.length; i++) {
      var dataRow = dataType[i]
      var hasData = dataRow[2]
      if (hasData) {
         // e.g. ['capitals', '1/10', [array]]
        var dataName = dataRow[0]
        var dataTitle = [dataName, ' ', ' ']
        var dataHeader = ['Campaign', 'AdGroup', '(keyword)']
        var spacing = [' ', ' ', ' ']
        var resultsData = dataRow[2]

        typeData.push(dataTitle)
        typeData.push(dataHeader)
        typeData = typeData.concat(resultsData)
        typeData.push(spacing)
      }
    }
    sheetData = sheetData.concat(typeData)
  }
  Logger.log(sheetData)
  
  Logger.log(' ')
  Logger.log('sheetData length: ' + sheetData.length)
  
  var end = rowCounter + sheetData.length - 1
  Logger.log('end: ' + end)
  var rangeText = 'A' + rowCounter + ':C' + end
  Logger.log('rangetext: ' + rangeText)
  var range = activeSheet.getRange(rangeText)
  range.setValues(sheetData)
}

// 1. check if accountname tab is available
//    if not, copy template and rename and set as active
//    if so, clear a1:c?? and set as active


function findAndClearSheet () {
  
  var dateToday = new Date()
  var dateText = Utilities.formatDate(dateToday, 'Europe/Amsterdam', 'yyyy-MM-dd')
  
  var accountName = AdWordsApp.currentAccount().getName()
  var tabName = accountName
  
  var old = spreadsheet.getSheetByName(tabName)
  
  var ranToday = false
  var sheet
  
  // if sheet exists
  if (old) {
	ranToday = old.getRange('A1').getValue() == dateText
  	Logger.log('a1 value: ' + old.getRange('A1').getValue())
    Logger.log(dateText)
    Logger.log('ranToday in function:' + ranToday)

    
    // if sheet exists and already ran today
    if (ranToday) {
      return [null, true]
    } else {
    // if sheet exists and did not run today
      spreadsheet.deleteSheet(old)
      // if date is old
      var sheet = spreadsheet.getSheetByName('template').copyTo(spreadsheet)
      //sheet.setName(tabName)
      //spreadsheet.setActiveSheet(sheet)
      SpreadsheetApp.flush() // ?? https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#flush
      sheet.setName(tabName)
      spreadsheet.setActiveSheet(sheet)
      
    }
  } else {
  // if sheet does not exist
    var sheet = spreadsheet.getSheetByName('template').copyTo(spreadsheet)
    SpreadsheetApp.flush() // ?? https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#flush
    sheet.setName(tabName)
    spreadsheet.setActiveSheet(sheet)
  }
  
  return [sheet, ranToday]
}

function addToOverview (allData, activeSheet) {
  var overviewSheetData = []
  var currentRow = 1

  for (var typeIndex = 0; typeIndex < allData.length; typeIndex++) {
    var dataType = allData[typeIndex]

    for (var i = 0; i < dataType.length; i++) {
      var dataRow = dataType[i]
      overviewSheetData.push([dataRow[0], dataRow[1]])
    }
	
    overviewSheetData.push([' ', ' '])
  }

  var range = activeSheet.getRange('A1:B' + overviewSheetData.length)
  range.setValues(overviewSheetData)
}

function addDate(activeSheet) {
  var dateToday = new Date()
  var dateText = Utilities.formatDate(dateToday, 'Europe/Amsterdam', 'yyyy-MM-dd')
  
  var firstCell = activeSheet.getRange('A1:A1')
  firstCell.setNumberFormat('@') // set cell as text
  firstCell.setValues([[dateText]])
}

function gaqlToday() {
  var dateToday = new Date()
  var dateText = Utilities.formatDate(dateToday, 'Europe/Amsterdam', 'yyyyMMdd')
  return dateText
}

function getAdData () {
  var adData = []
  var totalAds = 0
  var noHeadline3 = 0
  var noDescription2 = 0
  
  var adSelector = AdsApp
    .ads()
    .withCondition('Type = EXPANDED_TEXT_AD')
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('AdGroupStatus = ENABLED')
    .withCondition('Status = ENABLED')
    .get()
  
  totalAds = adSelector.totalNumEntities()
  
  while (adSelector.hasNext()) {
    var ad = adSelector.next()
    var eta = ad.asType().expandedTextAd()
    
    // returns string or null
    var headline3 = eta.getHeadlinePart3()
    var description2 = eta.getDescription2()
    
    if (!headline3) {
      noHeadline3++
    }
    if (!description2) {
      noDescription2++
    }
  }
  
  adData.push(['Ads with no headline 3', noHeadline3 + '/' + totalAds])
  adData.push(['Ads with no description 2', noDescription2 + '/' + totalAds])
  
  return adData
}

function getCampaignGaqlData () {
  Logger.log('Start function campaigngaqldata')
  // CPA all keywords / CPA conv kewyords
  var campaignData = []
  var totalCampaigns = 0
  var totalECpcCampaigns = 0
  var totalRoasCampaigns = 0
  
  var campaignReport = AdsApp.report(
    "SELECT EnhancedCpcEnabled, BiddingStrategyType " +
    "FROM CAMPAIGN_PERFORMANCE_REPORT " +
    "WHERE CampaignStatus = ENABLED " +
    "DURING LAST_7_DAYS ")
  
  var campaignRows = campaignReport.rows()
  
  while (campaignRows.hasNext()) {
    var campaignRow = campaignRows.next()
    var eCpcEnabled = campaignRow['EnhancedCpcEnabled']
    var biddingStrategy = campaignRow['BiddingStrategyType']
    totalCampaigns++
    if (eCpcEnabled !== 'false') {
      totalECpcCampaigns++
    }
    if (biddingStrategy === 'Target ROAS') {
      totalRoasCampaigns++
    }
  }
  
  campaignData.push(['Campaigns with eCpc', totalECpcCampaigns + '/' + totalCampaigns])
  campaignData.push(['Campaigns with ROAS', totalRoasCampaigns + '/' + totalCampaigns])

  return campaignData
}

function getVideoData () {
  Logger.log('Start function videodata')
  // CPA all keywords / CPA conv kewyords
  var videoData = []
  
  var hasViews = 'No'
  
  var videoReport = AdsApp.report(
    "SELECT VideoViews " +
    "FROM VIDEO_PERFORMANCE_REPORT " +
    "DURING 20150101, " + gaqlToday())
  
  var videoRows = videoReport.rows()
  
  while (videoRows.hasNext()) {
    var videoRow = videoRows.next()
    var views = videoRow['VideoViews']
    if (views > 0) {
      hasViews = 'Yes'
    }
  }
  
  videoData.push(['YouTube', ''])
  videoData.push(['Has YouTube views (via link)', hasViews])

  return videoData
}

function getHourOfDayData () {
  // CPA all keywords / CPA conv kewyords
  var hourOfDayData = []
  
  // this is dirty, use sort function
  var conversionCostPerHour = {
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
    '6': 0,
    '7': 0,
    '8': 0,
    '9': 0,
    '10': 0,
    '11': 0,
    '12': 0,
    '13': 0,
    '14': 0,
    '15': 0,
    '16': 0,
    '17': 0,
    '18': 0,
    '19': 0,
    '20': 0,
    '21': 0,
    '22': 0,
    '23': 0
  }
  
  var hourOfDayReport = AdWordsApp.report(
    "SELECT Conversions, HourOfDay, CostPerConversion " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    "DURING " + dateRange)
  
  var hourOfDayRows = hourOfDayReport.rows()
  
  while (hourOfDayRows.hasNext()) {
    var hourRow = hourOfDayRows.next()
    var hour = hourRow['HourOfDay']
    var conversionCost = hourRow['CostPerConversion']
    conversionCostPerHour[hour.toString()] = parseFloat(conversionCost)
  }
    
  hourOfDayData.push(['Hour of day', 'Cost per conversions'])
  hourOfDayData.push(['0', conversionCostPerHour[0]])
  hourOfDayData.push(['1', conversionCostPerHour[1]])
  hourOfDayData.push(['2', conversionCostPerHour[2]])
  hourOfDayData.push(['3', conversionCostPerHour[3]])
  hourOfDayData.push(['4', conversionCostPerHour[4]])
  hourOfDayData.push(['5', conversionCostPerHour[5]])
  hourOfDayData.push(['6', conversionCostPerHour[6]])
  hourOfDayData.push(['7', conversionCostPerHour[7]])
  hourOfDayData.push(['8', conversionCostPerHour[8]])
  hourOfDayData.push(['9', conversionCostPerHour[9]])
  hourOfDayData.push(['10', conversionCostPerHour[10]])
  hourOfDayData.push(['11', conversionCostPerHour[11]])
  hourOfDayData.push(['12', conversionCostPerHour[12]])
  hourOfDayData.push(['13', conversionCostPerHour[13]])
  hourOfDayData.push(['14', conversionCostPerHour[14]])
  hourOfDayData.push(['15', conversionCostPerHour[15]])
  hourOfDayData.push(['16', conversionCostPerHour[16]])
  hourOfDayData.push(['17', conversionCostPerHour[17]])
  hourOfDayData.push(['18', conversionCostPerHour[18]])
  hourOfDayData.push(['19', conversionCostPerHour[19]])
  hourOfDayData.push(['20', conversionCostPerHour[20]])
  hourOfDayData.push(['21', conversionCostPerHour[21]])
  hourOfDayData.push(['22', conversionCostPerHour[22]])
  hourOfDayData.push(['23', conversionCostPerHour[23]])

  return hourOfDayData
}

function getWeekdayData () {
  Logger.log('Start function weekdaydata')
  // CPA all keywords / CPA conv kewyords
  var weekdayData = []
  
  var conversionCostPerDay = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0
  }
  
  var weekdayReport = AdWordsApp.report(
    "SELECT Conversions, DayOfWeek, CostPerConversion " +
    "FROM ACCOUNT_PERFORMANCE_REPORT " +
    "DURING " + dateRange)
  
  var weekdayRows = weekdayReport.rows()
  
  while (weekdayRows.hasNext()) {
    var dayRow = weekdayRows.next()
    var day = dayRow['DayOfWeek']
    var conversionCost = dayRow['CostPerConversion']
    conversionCostPerDay[day] = parseFloat(conversionCost)
  }
    
  weekdayData.push(['Day of week (' + dateRange + ')', 'Cost per conversion'])
  weekdayData.push(['Monday', conversionCostPerDay['Monday']])
  weekdayData.push(['Tuesday', conversionCostPerDay['Tuesday']])
  weekdayData.push(['Wednesday', conversionCostPerDay['Wednesday']])
  weekdayData.push(['Thursday', conversionCostPerDay['Thursday']])
  weekdayData.push(['Friday', conversionCostPerDay['Friday']])
  weekdayData.push(['Saturday', conversionCostPerDay['Saturday']])
  weekdayData.push(['Sunday', conversionCostPerDay['Sunday']])

  return weekdayData
}

function getDateByDaysAgo(daysAgo) {
	var today = new Date()
	today.setDate(today.getDate() - daysAgo)
    var formattedDate = Utilities.formatDate(today, 'PST', 'yyyyMMdd')
    return formattedDate
}
