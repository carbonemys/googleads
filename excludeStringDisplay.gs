/***

  * Adgroup level auto keyword excluder *

  1. Automatically exclude placements containing array values in variable exWords
  2. Automatically exclude placements that do not contain domain extensions in include() function
  3. Modify date range if necessary
  
***/

var dateRange = 'LAST_30_DAYS'; // use official adwords scripts date range formatting

// 1. exclude placements containing: ************************************

var exWords = ['wordfeud',
               'haber',
               'game',
               'viral'];

function main() {
  include();
  for (var i in exWords) {
    inefloop(exWords[i]);
  }
}

function include() {
  var placementSelector = AdWordsApp.display()
     .placements()
     .withCondition("Impressions > 1")
    
// 2. exclude placements that do not contain: ******************************
  
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.nl'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.com'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.net'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.org'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.nu'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.be'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.de'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.google'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.info'")
     .withCondition("PlacementUrl DOES_NOT_CONTAIN '.tv'")
     .forDateRange(dateRange)
     .orderBy("Clicks DESC");

 var placementIterator = placementSelector.get();
 while (placementIterator.hasNext()) {
   var placement = placementIterator.next();
   var adgroup = placement.getAdGroup();
   var placeUrl = placement.getUrl();
      var placementBuilder = adgroup.display().newPlacementBuilder()
     .withUrl(placeUrl)  // required
     .exclude();
   Logger.log(placeUrl);
 }
}

function inefloop(dotext) {
  var placementSelector = AdWordsApp.display()
  .placements()
  .withCondition("Impressions > 1")
  .withCondition("PlacementUrl CONTAINS '" + dotext + "'")
  .forDateRange(dateRange)
  .orderBy("Clicks DESC");
  
  var placementIterator = placementSelector.get();
  while (placementIterator.hasNext()) {
    var placement = placementIterator.next();
    var adgroup = placement.getAdGroup();
    var placeUrl = placement.getUrl();
    var placementBuilder = adgroup.display().newPlacementBuilder()
    .withUrl(placeUrl)
    .exclude();
    Logger.log(placeUrl);
  }
}
