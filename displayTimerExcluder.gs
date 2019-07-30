/*
  - campaignName CONTAINS
  - check logs
*/

var dateRange = 'TODAY'
var maxClicks = 5
var minConversions = 1
var campaignName = 'Display'

function main() {
  excludePlacements()
}

function excludePlacements() {
  var placementSelector = AdsApp.display()
     .placements()
     .withCondition("Conversions < " + minConversions)
     .withCondition("Clicks >= " + maxClicks)
     .withCondition("CampaignName CONTAINS " + campaignName)
     .forDateRange(dateRange)

 var placementIterator = placementSelector.get()
 while (placementIterator.hasNext()) {
   var placement = placementIterator.next()
   var adgroup = placement.getAdGroup()
   var placeUrl = placement.getUrl()
   var stats = placement.getStatsFor(dateRange)
   var clicks = stats.getClicks()
   var conversions = stats.getConversions()
      var placementBuilder = adgroup.display().newPlacementBuilder()
     .withUrl(placeUrl)
     .exclude();
   Logger.log(placeUrl + ' has ' + clicks + ' clicks and ' + conversions + ' conversions')
 }
}
