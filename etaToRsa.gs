/*
  - creates RSA ads based on all ETAs within an adgroup
*/

// settings
var accountId = 'XXX-XXX-XXXX'

// select accounts and execute function
function main() {
  var account = AdsManagerApp.accounts().withIds([accountId])
  Logger.log(account.get().next().getName())
  account.executeInParallel('etasToRsa')
}

// 
function etasToRsa() {
  
  // select all enabled search adgroups
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('Status = ENABLED')
    .withCondition("AdvertisingChannelType = SEARCH")
  //.withCondition("LabelNames CONTAINS_ANY ['AdGroupLabelName']")
    .get()
  
  while (adGroupIterator.hasNext()) {
    var adGroup = adGroupIterator.next()

    // store all add data within adgroup
    var headlines = []
    var descriptions = []
    var finalUrl = ''

    // find all enabled ads within the adgroup
    var adIterator = adGroup.ads()
      .withCondition('Status = ENABLED')
   	  .withCondition('Type = EXPANDED_TEXT_AD')
      .get()

    // run through each ETA
    while (adIterator.hasNext()) {
      var ad = adIterator.next()
      var eta = ad.asType().expandedTextAd()

      // collect all parts of the ETA
      var headline1 = eta.getHeadlinePart1()
      var headline2 = eta.getHeadlinePart2()
      var headline3 = eta.getHeadlinePart3()
      var description1 = eta.getDescription1()
      var description2 = eta.getDescription2()
      var finalUrl = ad.urls().getFinalUrl()

      // check if each element is already collected, not empty and fits within the RSA
      if (headlines.indexOf(headline1) < 0 && headline1 !== null && headlines.length < 15) {
        headlines.push(headline1)
      }
      if (headlines.indexOf(headline2) < 0 && headline2 !== null && headlines.length < 15) {
        headlines.push(headline2)
      }
      if (headlines.indexOf(headline3) < 0 && headline3 !== null && headlines.length < 15) {
        headlines.push(headline3)
      }
      if (descriptions.indexOf(description1) < 0 && description1 !== null && descriptions.length < 4) {
        descriptions.push(description1)
      }
      if (descriptions.indexOf(description2) < 0 && description2 !== null && descriptions.length < 4) {
        descriptions.push(description2)
      }
    }

    // build RSA if enough data is available in adgroup
    if (descriptions.length >= 2 && headlines.length >= 3 && finalUrl !== '') {
      adGroup.newAd().responsiveSearchAdBuilder()
        .withHeadlines(headlines)
        .withDescriptions(descriptions)
        .withFinalUrl(finalUrl)
        .build()
    } else {
      Logger.log('Not enough headlines or descriptions for adgroup: ' + adGroup.getName())
    }
  }
}
