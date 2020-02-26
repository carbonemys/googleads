/**
 * @name MCC Placement Link Excluder
 *
 * @overview Excludes a list from specified Google Sheet in multiple
 *     accounts.
 *
 * @instructions Add sheets placement list url to config variable, 
 *     as well as list name (should already be added in account) and
 *     accountlabel.
 *     Always run an example and check examples before executing.
 *
 * @author Bas Baudoin
 *
 * @version 1.0 (2020-02-26)
 *
 * @changelog
 *
 * @todos
 *  - (?) create actual list?
 *  - (?) apply list to all display campaigns?
 */

var config = {
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1qPklBM7Okt6c3GzAfRqhdzPBoe7vpktDED92_eJIa-o/edit#gid=0',
  negativePlacementsList: 'uitgesloten plaatsingen',
  accountLabel: 'Actief beheer'
}

/** Do not modify below this line **/

var spreadsheet = SpreadsheetApp.openByUrl(config.spreadsheetUrl)
var placements = getPlacementsFromSheets()
  
function main() {
  getPlacementsFromSheets()
  try {
    MccApp
      .accounts()
      .withCondition("LabelNames CONTAINS '" + config.accountLabel + "'")
      .executeInParallel('excludeList')
  } catch (e) {
    Logger.log('No accounts found')
  }
}

function excludeList() {
  Logger.log(AdsApp.currentAccount().getName())
  var negativeListSelectorIterator = AdsApp.excludedPlacementLists()
    .withCondition("Name = '" + config.negativePlacementsList + "'")
    .get()
  if (negativeListSelectorIterator.totalNumEntities() > 0) {
    Logger.log('Placemements:')
    Logger.log(placements)
    Logger.log('Excluded from account ' + AdsApp.currentAccount().getName())
    negativeListSelectorIterator.next().addExcludedPlacements(placements)
  } else {
    Logger.log('Negative placements list ' + config.negativePlacementsList + ' does not yet exist for account ' + AdsApp.currentAccount().getName())
  }
  Logger.log('---')
}

function getPlacementsFromSheets() {
  var sheet = spreadsheet.getActiveSheet()
  var multiDimensionalRange = sheet.getRange('A1:A' + sheet.getLastRow()).getValues()
  const range = multiDimensionalRange.map(function (x) { return x[0]})
  Logger.log(range)
  return(range)
}
