/***
  * Adgroup level auto keyword excluder *
  
  Script by Bas Baudoin for happyleads.nl
  
  About the script: the script has 2 functions, it includes ONLY placements
    containing certain string(s) and it excludes placements that contain
    other string(s).

  Instructions:
  You can modify 3 things in this script:
  1. Date range         (line 20)
  2. Strings to exclude (line 23)
  3. Strings to include (line 46)
  Schedulde hourly
  
***/

// (Modify 1.) Use official adwords scripts date range formatting
var dateRange = 'LAST_30_DAYS'

// (Modify 2.) Exclude placements containing:
var exWords = ['wordfeud',
               'haber',
               'game',
               'viral']

// Main function, do not change
function main() {
  includeOnly()
 
  // (this is inefficient)
  for (var i in exWords) {
    excludeContaining(exWords[i])
  }
}

// Include only function
function includeOnly() {
  var placementSelector = AdsApp.display()
     .placements()
     .withCondition("Impressions > 1")
    
  // (Modify 3.) exclude placements that do not contain
  // use same formatting as below
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
     .orderBy("Clicks DESC")

 // Add negative placement
  var placementIterator = placementSelector.get()
  while (placementIterator.hasNext()) {
    var placement = placementIterator.next()
    var adgroup = placement.getAdGroup()
    var placeUrl = placement.getUrl()
      var placementBuilder = adgroup.display().newPlacementBuilder()
     .withUrl(placeUrl)
     .exclude()
   Logger.log('Excluded placement: ' + placeUrl)
  }
}

// Exclude function, runs for each exWord
function excludeContaining(dotext) {

  // Select placements
  var placementSelector = AdsApp.display()
  .placements()
  .withCondition("Impressions > 1")
  .withCondition("PlacementUrl CONTAINS '" + dotext + "'")
  .forDateRange(dateRange)
  .orderBy("Clicks DESC")
  
  // Add negative placement
  var placementIterator = placementSelector.get()
  while (placementIterator.hasNext()) {
    var placement = placementIterator.next()
    var adgroup = placement.getAdGroup()
    var placeUrl = placement.getUrl()
    var placementBuilder = adgroup.display().newPlacementBuilder()
    .withUrl(placeUrl)
    .exclude()
    Logger.log('Excluded placement: ' + placeUrl)
  }
}
