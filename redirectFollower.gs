/*
  ETA ONLY FOR NOW
  TODO:
  - 
  
  Sources: https://stackoverflow.com/questions/27098169/what-google-appsscript-method-is-used-to-get-the-url-of-a-redirect
*/

var dateRange = 'TODAY';          // e.g. TODAY, YESTERDAY, LAST_7_DAYS

// functions - do not alter ************************************************************

function main() {
  var urls = getActiveUrls()
  Logger.log(urls)

  if (Object.keys(urls).length > 0) {
    updateAds(urls)
  }
}

function updateAds(urls) {
  var adSelector = AdsApp.ads()
    .withCondition('Status = ENABLED')
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED")
    .withCondition("Type IN [EXPANDED_TEXT_AD]")
    .get()
  
   while (adSelector.hasNext()) {
     var ad = adSelector.next()
     var finalUrl = ad.urls().getFinalUrl()
     var adGroup = ad.getAdGroup()
     var eta = ad.asType().expandedTextAd()
     var rsa = ad.asType().responsiveSearchAd()
     
     // optional values
     var path1 = eta.getPath1() || ''
     var path2 = eta.getPath2() || ''
     var headline3 = eta.getHeadlinePart3() || ''
     var description2 = eta.getDescription2() || ''

     var hasNewUrl = urls[finalUrl]

     if (hasNewUrl) {
       Logger.log('ad: ' + finalUrl + ' - ' + hasNewUrl)

        var adOperation = adGroup.newAd().expandedTextAdBuilder()
          .withHeadlinePart1(eta.getHeadlinePart1())
          .withHeadlinePart2(eta.getHeadlinePart2())
          .withHeadlinePart3(headline3)
          .withDescription1(eta.getDescription1())
          .withDescription2(description2)
          .withPath1(path1)
          .withPath2(path2)
          .withFinalUrl(hasNewUrl)
          .build()
        ad.pause()
     }
  }
}

function getActiveUrls() {
  var oneAccountObject = {}
  var oneAccountString = ""
  
  var finalRows = AdWordsApp.report(
    " SELECT EffectiveFinalUrl, Impressions " +
    " FROM FINAL_URL_REPORT " + 
    " WHERE Impressions > 0 " +
    " DURING " + dateRange)
  
  var rows = finalRows.rows() // runs through awql
  
  while (rows.hasNext()) {
    var row = rows.next()
    var finalUrl = row['EffectiveFinalUrl']
    
    var response = UrlFetchApp.fetch(finalUrl, { followRedirects: false, muteHttpExceptions: true })
    var responseCode = response.getResponseCode()
    var newUrl = response.getHeaders()['Location']

    if (!responseCode) {
      Logger.log('no response code')

      // redirect starts with 3
    } else if (responseCode.toString()[0] == '3') {
        if (newUrl.indexOf('http') >= 0) {
          oneAccountObject[String(finalUrl)] = newUrl
          // Logger.log(finalUrl + " response code " + responseCode + " \n")
        } else {
          Logger.log(newUrl + ' does not contain http')
        }
    }
  }
  return oneAccountObject
}
