// 진단용: 현재 프로젝트의 티저 comp 에서 이름에 LET'S GO / K-FASHION 이 들어간 레이어의 in/out 을 기록한다
(function () {
  var out = [];
  var comp = null;
  for (var i = 1; i <= app.project.numItems; i++) { var it = app.project.item(i); if (it instanceof CompItem && it.name.indexOf("POTATA Teaser") === 0) { comp = it; break; } }
  if (!comp) { out.push("no comp"); }
  else {
    for (var j = 1; j <= comp.numLayers; j++) {
      var L = comp.layer(j);
      if (L.name.indexOf("LET'S GO") >= 0 || L.name.indexOf("K-FASHION") >= 0 || L.name.indexOf("S03") >= 0) {
        out.push(j + " | " + L.name + " | in=" + L.inPoint.toFixed(3) + " out=" + L.outPoint.toFixed(3) + " start=" + L.startTime.toFixed(3) + " enabled=" + L.enabled + " opKeys=" + L.opacity.numKeys + " op@6.7=" + L.opacity.valueAtTime(6.7, false));
      }
    }
  }
  var f = new File("C:/Users/jangk/Downloads/potata-teaser/probe-layers.txt"); f.encoding = "UTF-8";
  if (f.open("w")) { f.write(out.join("\n")); f.close(); }
})();
