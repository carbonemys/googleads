/* 
  1. Select all queries that do not contain sting(s)
  2. Add queries to shared negatives list
*/

// ********* Settings *********
var dateRange = "TODAY";
var listname = "scriptlist";
var excludeKeyword = "christmas";

// Functions, do not change
var negativesArray = [];

function main() {
  findNonQuery();
  Exclude();
}

function findNonQuery() {
  var convQueryList = AdWordsApp.report(
    "SELECT Query, CampaignName " +
    "FROM   SEARCH_QUERY_PERFORMANCE_REPORT " +
    "WHERE " + 
    "CampaignName CONTAINS Shop " +
    "AND Query DOES_NOT_CONTAIN " + excludeKeyword + " " +
    "DURING " + dateRange);
  
  var rows = convQueryList.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var query = row['Query'];
    negativesArray.push(query);
  }
  Logger.log(negativesArray);
}

function Exclude() {
  
  var negativeKeywordListSelector = AdWordsApp.negativeKeywordLists()
  .withCondition("Name CONTAINS '" + listname + "'").withLimit(1).get();

  while (negativeKeywordListSelector.hasNext()) {
    var negativeKeywordList = negativeKeywordListSelector.next();
    negativeKeywordList.addNegativeKeywords(negativesArray);
  }
}
