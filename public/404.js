// Served with 404.html for any unknown path. Billwise routes live after "#/", so an address like
// /bills or /Calendar/ goes to the matching screen and anything else goes to the Overview.
// (An external file rather than an inline script, so the Content-Security-Policy can stay strict.)
;(function () {
  var routes = { bills: 1, calendar: 1, settings: 1 }
  var parts = location.pathname.toLowerCase().split('/').filter(Boolean)
  var route = parts.map(function (p) { return p.replace(/\.html?$/, '') }).filter(function (p) { return routes[p] })[0]
  location.replace('/' + (route ? '#/' + route : ''))
})()
