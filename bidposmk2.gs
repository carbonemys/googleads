/*
  (auto) bid to position
  
  This script:
  - Checks lost budget impression share per campaign.
  - If this is more than 25% (so limited by budget)
     => aim for bottom
  - If this is between 0% and 20%
     => aim for subtop
  - If this is 0%
     => aim for top
  - For each keyword, if one position has 50%+ cpc is raised
      or lowered with 20% to get to the right position

  CHECK LOGS

  todos:
  - top position segment log
  - handle NaN
  - matchtype different strategies
  - reevaluate >.5
  - summary of changes
  
  version: 2019-06-03
*/

var settings = {
  accoundId: '',
  dateRange: 'LAST_30_DAYS',
  minImpressions: 3, // does not work yet
  bidAdjustment: .20,
  minStrategySize: .5,
  
  // 'absTop', 'top' or 'bottom'
  // leave empty for auto strategy
  // does not work yet
  manualStrategy: '',
}

function main () {
  MccApp.accounts().withIds([settings.accoundId]).executeInParallel('bidPos')
}

function bidPos () {

  var campaignsReport = AdsApp.report(
    'select SearchBudgetLostImpressionShare, CampaignId, CampaignName ' +
    'from CAMPAIGN_PERFORMANCE_REPORT ' +
    'where AdvertisingChannelType = SEARCH ' +
    'and CampaignStatus = ENABLED ' +
    'during ' + settings.dateRange
  )
  
  var campaignRows = campaignsReport.rows()
  
  while (campaignRows.hasNext()) {
    var campaign = campaignRows.next()
    var campaignId= campaign['CampaignId']
    var campaignName = campaign['CampaignName']
    var lostImpressionShare = parseFloat(campaign['SearchBudgetLostImpressionShare'])/100
    
    var strategy = ''
    
    if (lostImpressionShare == 0) {
      strategy = 'absTop'
    } else if (lostImpressionShare < .25) {
      strategy = 'top'
    } else if (lostImpressionShare >= .25) {
      strategy = 'bottom'
    }
    
    Logger.log('> ' + campaignName + ' lost impshare: ' + parseFloat(lostImpressionShare))
    Logger.log('> bid for ' + strategy)
    
    bidding(campaignId, strategy)
    
    // +25% => bottom
    // 0-25% => top
    // 0% => absTop
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
    // Logger.log('---')

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
    
    Logger.log('---')
  }
}
