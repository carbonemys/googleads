/*
  Redirect follower v2.1 by Bas Baudoin
  
  This scripts replaces ETA/RSA final URLs with 301/302 redirected URL if available
  
  Instructions:
  - MCC script
  - Change account ID
  - Run example, check logs
  
  Todos
  - Non-domain urls (?)
  - Refactor
*/

var accountId = 'XXX-XXX-XXXX'

// placeholders
var urlCombos = {}
var checkedUrls = {}

// functions - do not alter ************************************************************

function main() {
  var account = AdsManagerApp.accounts().withIds([accountId])
  Logger.log(account.get().next().getName())
  account.executeInParallel('updateAds')
}


function updateAds() {
  updateSitelinks()
  var adSelector = AdsApp.ads()
    .withCondition('Status = ENABLED')
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED")
    .withCondition("Type IN [EXPANDED_TEXT_AD, VERSATILE_TEXT_AD]")
    .get()

  while (adSelector.hasNext()) {
    var ad = adSelector.next()
    var finalUrl = ad.urls().getFinalUrl()
    var adGroup = ad.getAdGroup()
    var adType = ad.getType()

    // check url availability or add to objects
    findRedirectUrl(finalUrl)
    var hasNewUrl = urlCombos[finalUrl]
    var hasNoNewUrl = checkedUrls[finalUrl]
    
    if (hasNewUrl) {
     
      // Recreate ETA
      if (adType == 'EXPANDED_TEXT_AD') {
        Logger.log('new ETA in ' + ad.getAdGroup().getName())
        var eta = ad.asType().expandedTextAd()

        var path1 = eta.getPath1() || ''
        var path2 = eta.getPath2() || ''
        var headline3 = eta.getHeadlinePart3() || ''
        var description2 = eta.getDescription2() || ''
        //var labelIterator = eta.labels().get()
        var labelIterator = ad.labels().get()

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
        
        var newAd = adOperation.getResult()

        while (labelIterator.hasNext()) {
          var label = labelIterator.next()
          var labelText = label.getName()
          newAd.applyLabel(labelText)
        }

        ad.pause()

        // Recreate RSA
      } else if (adType == 'VERSATILE_TEXT_AD') {
        Logger.log('new RSA in ' + ad.getAdGroup().getName())
        var rsa = ad.asType().responsiveSearchAd()

        var headlines = rsa.getHeadlines()
        var descriptions = rsa.getDescriptions()
        var labelIterator = rsa.labels().get()
        
        Logger.log('ad: ' + finalUrl + ' - ' + hasNewUrl)

        var rsaOperation = adGroup.newAd().responsiveSearchAdBuilder()
          .withHeadlines(headlines)
          .withDescriptions(descriptions)
          .withFinalUrl(hasNewUrl)
          .build()

        var newAd = rsaOperation.getResult()

        while (labelIterator.hasNext()) {
          var label = labelIterator.next()
          var labelText = label.getName()
          newAd.applyLabel(labelText)
        }
        ad.pause()
      }
    }
  }
  Logger.log('Final results')
  Logger.log(urlCombos)
  Logger.log(checkedUrls)
}

function updateSitelinks() {
  var accountSitelinkIterator = AdsApp
    .extensions()
    .sitelinks()
    .withCondition('Status = ENABLED')
    .get()

  while (accountSitelinkIterator.hasNext()) {
    var sitelink = accountSitelinkIterator.next()
    var finalUrl = sitelink.urls().getFinalUrl()

    // check url availability or add to objects
    findRedirectUrl(finalUrl)
    var hasNewUrl = urlCombos[finalUrl]
    var hasNoNewUrl = checkedUrls[finalUrl]

    if (hasNewUrl) {
      Logger.log('Sitelink has new URL')
      sitelink.urls().setFinalUrl(hasNewUrl)
    }
  }

}

function findRedirectUrl(finalUrl) {
  if (urlCombos[finalUrl] || checkedUrls[finalUrl]) {
    //Logger.log('Url already checked')
    return false
  }
  
  var response = UrlFetchApp.fetch(finalUrl, { followRedirects: false, muteHttpExceptions: true })
  var responseCode = response.getResponseCode()
  var newUrl = response.getHeaders()['Location']
  
  if (!newUrl) {
    checkedUrls[finalUrl] = 'checked'
  }

  if (!responseCode) {
    Logger.log('no response code')

    // redirect starts with 3
  } else if (responseCode.toString()[0] == '3') {
    if (newUrl.indexOf('http') >= 0) {
      urlCombos[finalUrl] = newUrl
      return true
    } else {
      checkedUrls[finalUrl] = 'checked'
      //Logger.log(newUrl + ' does not contain http')
    }
  }
  return false
}
