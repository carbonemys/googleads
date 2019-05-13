/*
  CHECK LOGS

  todos:
  - top position segment log
  - handle NaN
  - matchtype different strategies
  - reevaluate >.5
*/

var settings = {
  accoundId: '',
  dateRange: 'LAST_30_DAYS',
  minImpressions: 3,
  bidAdjustment: .20,
  minStrategySize: .5,
  
  // 'absTop', 'top' or 'bottom'
  // leave empty for auto strategy
  manualStrategy: '',
}

function main () {
  MccApp.accounts().withIds([settings.accoundId]).executeInParallel('bidPos')
}

function bidPos () {

  var campaignsReport = AdsApp.report(
    'select SearchBudgetLostImpressionShare, CampaignId ' +
    'from CAMPAIGN_PERFORMANCE_REPORT ' +
    'where AdvertisingChannelType = SEARCH ' +
    'and CampaignStatus = ENABLED ' +
    'during ' + settings.dateRange
  )
  
  var campaignRows = campaignsReport.rows()
  
  while (campaignRows.hasNext()) {
    var campaign = campaignRows.next()
    var campaignId= campaign['CampaignId']
    var lostImpressionShare = parseFloat(campaign['SearchBudgetLostImpressionShare'])/100
    
    Logger.log(campaignId + ' ' + parseFloat(lostImpressionShare))
    
    var strategy = ''
    
    if (lostImpressionShare == 0) {
      strategy = 'absTop'
    } else if (lostImpressionShare < .2) {
      strategy = 'top'
    } else if (lostImpressionShare >= .2) {
      strategy = 'bottom'
    }
    
    bidding(campaignId, strategy)
    
    // +40% => bottom
    // 0-20% => top
    // 0% => bottom
  }
}

function bidding (campaignId, strategy) {
  var keywordReport = AdsApp.report(
    'select SearchRankLostAbsoluteTopImpressionShare, ' +
    'SearchRankLostTopImpressionShare, ' +
    'SearchRankLostImpressionShare, ' +
    'Criteria, ' +
    'KeywordMatchType, ' +
    'Id, AdGroupId ' +
    'from KEYWORDS_PERFORMANCE_REPORT ' +
    'where CampaignStatus = ENABLED ' +
    'and AdGroupStatus = ENABLED ' +
    'and Status = ENABLED ' +
    'and AdNetworkType1 = SEARCH ' +
    'and CampaignId = ' + campaignId + ' ' +
    'during ' + settings.dateRange
  )
  
  var keywordRows = keywordReport.rows()
  
  while (keywordRows.hasNext()) {
    var keyword = keywordRows.next()
    var keywordName = keyword['Criteria']
    var keywordId = [keyword['AdGroupId'], keyword['Id']]
    var matchType = keyword['KeywordMatchType']
    var lostAbsTopImpShare = keyword['SearchRankLostAbsoluteTopImpressionShare']
    var lostTopImpShare = keyword['SearchRankLostTopImpressionShare']
    var lostImpShare = parseFloat(keyword['SearchRankLostImpressionShare'])/100
    
    //calculated metrics
    var absImpressions = 1 - lostAbsTopImpShare
    var subtopImpressions = 1 - absImpressions - lostTopImpShare
    var bottomImpressions = 1 - absImpressions - subtopImpressions - lostImpShare
    var noImpressions = lostImpShare
    var checkTest = absImpressions + subtopImpressions + bottomImpressions + noImpressions
    
    Logger.log(keywordName + ' (' + matchType + ')')
    Logger.log('abstop: ' + absImpressions)
    Logger.log('subtop: ' + subtopImpressions)
    Logger.log('bottom: ' + bottomImpressions)
    Logger.log('LOST  : ' + noImpressions)
    Logger.log('CHECK : ' + checkTest)
    Logger.log('---')

    var keywordSelector = AdsApp.keywords().withIds([keywordId]).get()
    var keyword = keywordSelector.next()
    var currentCpc = keyword.bidding().getCpc()

    // abs top strategy
    if (strategy == 'absTop') {
      if (absImpressions < settings.minStrategySize) {
        var newCpc = currentCpc * (1 + settings.bidAdjustment)
        keyword.bidding().setCpc(newCpc)
        Logger.log('cpc: ' + currentCpc + ' - new cpc: ' + newCpc + ' - strategy: ' + strategy)
      }
    // subtop strategy
    } else if (strategy == 'top') {
      if (absImpressions > .5) {
        var newCpc = currentCpc * (1 - settings.bidAdjustment)
        keyword.bidding().setCpc(newCpc)
        Logger.log('cpc: ' + currentCpc + ' - new cpc: ' + newCpc + ' - strategy: ' + strategy)
      } else if (bottomImpressions + noImpressions > .5) {
        var newCpc = currentCpc * (1 + settings.bidAdjustment)
        keyword.bidding().setCpc(newCpc)
        Logger.log('cpc: ' + currentCpc + ' - new cpc: ' + newCpc + ' - strategy: ' + strategy)
      }
      
    // bottom strategy
    } else if (strategy == 'bottom') {
      if (absImpressions + subtopImpressions > .5) {
        var newCpc = currentCpc * (1 - settings.bidAdjustment)
        keyword.bidding().setCpc(newCpc)
        Logger.log('cpc: ' + currentCpc + ' - new cpc: ' + newCpc + ' - strategy: ' + strategy)
      } else if (noImpressions > .5) {
        var newCpc = currentCpc * (1 + settings.bidAdjustment)
        keyword.bidding().setCpc(newCpc)
        Logger.log('cpc: ' + currentCpc + ' - new cpc: ' + newCpc + ' - strategy: ' + strategy)
      }
    }
  }
}
