window.PDPanelRenderers = {
    renderAllDiaries: function(app, isoDate, s) {
        var html = '';

        if (showDiarists) {
            html += '<h3 style="margin-bottom:4px">Diarists — ' + formatDate(isoDate) + '</h3>';
            html += barRow('', s.geo_diarists, s.active_diarists, maxActive);
            html += '<div style="font-size:11px;color:#666;margin:2px 0 0">' +
                '<span style="color:#2d8a4e">&#9632;</span> ' + s.geo_diarists + ' geo &nbsp; ' +
                '<span style="color:#bbb">&#9632;</span> ' + (s.active_diarists - s.geo_diarists) + ' non-geo' +
                '</div>';
        }
        if (showCumulative) {
            var cum = getCumulative(isoDate);
            html += '<div class="section">';
            html += '<b style="font-size:12px">Cumulative diarists (to date)</b>';
            html += barRow('', cum.geo, cum.all, 238);
            html += '<div style="font-size:11px;color:#666;margin:2px 0 0">' +
                '<span style="color:#2d8a4e">&#9632;</span> ' + cum.geo + ' with geo &nbsp; ' +
                '<span style="color:#bbb">&#9632;</span> ' + (cum.all - cum.geo) + ' no geo yet &nbsp; ' +
                '(' + cum.all + ' appeared)' +
                '</div>';
            html += '</div>';
        }
        if (showRolling) {
            var daysAll = getLastNDays(isoDate, rollingDays);
            daysAll.reverse();
            html += '<div class="section">';
            html += '<b style="font-size:12px">Last ' +
                '<select id="selDays" style="font-size:12px;width:45px">' +
                '<option value="7"' + (rollingDays == 7 ? ' selected' : '') + '>7</option>' +
                '<option value="14"' + (rollingDays == 14 ? ' selected' : '') + '>14</option>' +
                '<option value="30"' + (rollingDays == 30 ? ' selected' : '') + '>30</option>' +
                '</select>' +
                ' days — diarists</b>';
            for (var i = 0; i < daysAll.length; i++) {
                var dsAll = getStats(daysAll[i]);
                html += barRow(daysAll[i].slice(5), dsAll.geo_diarists, dsAll.active_diarists, maxActive);
            }
            html += '</div>';
        }
        if (showMentions) {
            html += '<div class="section"><span style="font-size:12px"><b>' + s.geo_mentions + '</b> geolocations on map today</span></div>';
        }
        if (showTopPlaces) {
            var topPlaces = getTopPlaces(isoDate, 5);
            var topMax = topPlaces.length > 0 ? topPlaces[0].count : 1;
            html += '<div class="section"><b style="font-size:12px">Top 5 places (to date)</b>';
            for (var t = 0; t < topPlaces.length; t++) {
                var pct = Math.round((topPlaces[t].count / topMax) * 100);
                html += '<div class="bar-row">' +
                    '<span style="width:18px;text-align:right;margin-right:4px;flex-shrink:0;font-size:11px;color:#888">' + (t + 1) + '</span>' +
                    '<span class="bar-track" style="flex:0 0 45%"><span class="bar-geo" style="width:' + pct + '%"></span></span>' +
                    '<span style="font-size:11px;margin-left:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + topPlaces[t].count + ' ' + topPlaces[t].name + '</span>' +
                    '</div>';
            }
            html += '</div>';
        }

        return html;
    },

    renderOneDiary: function(app, isoDate, options) {
        var html = '';
        var did = String((app && app.state && app.state.selectedDiaryId) || "");
        var dm = (app && app.diaryMeta && app.diaryMeta[did]) || {
            total_geo_entries: 0, first_date: "-", last_date: "-", active_geo_days: 0, unique_places: 0
        };
        var todayGeo = (app && app.diaryGeoCountByDate && app.diaryGeoCountByDate[did] && app.diaryGeoCountByDate[did][isoDate]) || 0;
        var hasDiaryDailyActivity = (typeof diaryDailyActivity !== "undefined") && diaryDailyActivity && diaryDailyActivity[did];
        var scopeFirst = dm.first_date;
        var scopeLast = dm.last_date;
        if (hasDiaryDailyActivity) {
            var scopeArr = (diaryDailyActivity[did] || []).slice().sort();
            if (scopeArr.length) {
                scopeFirst = scopeArr[0];
                scopeLast = scopeArr[scopeArr.length - 1];
            }
        }

        html += '<div style="font-size:12px"><b>' + dm.total_geo_entries + '</b> geolocated entries total</div>';
        html += '<div style="font-size:11px;color:#666">Date scope (all): ' + scopeFirst + ' to ' + scopeLast + '</div>';
        html += '<div style="font-size:11px;color:#666">Active geo days: ' + dm.active_geo_days + ' &nbsp;|&nbsp; Unique places: ' + dm.unique_places + '</div>';
        if (showMentions) {
            html += '<div class="section"><span style="font-size:12px"><b>' + todayGeo + '</b> geolocations on map today</span></div>';
        }
        if (showRolling) {
            var daysDiary = app.getLastNDays(isoDate, rollingDays);
            daysDiary.reverse();
            var scaleDiary = hasDiaryDailyActivity ? 1 : ((app && app.diaryMaxDaily && app.diaryMaxDaily[did]) || 1);
            html += '<div class="section">';
            html += '<b style="font-size:12px">Last ' +
                '<select id="selDays" style="font-size:12px;width:45px">' +
                '<option value="7"' + (rollingDays == 7 ? ' selected' : '') + '>7</option>' +
                '<option value="14"' + (rollingDays == 14 ? ' selected' : '') + '>14</option>' +
                '<option value="30"' + (rollingDays == 30 ? ' selected' : '') + '>30</option>' +
                '</select>' +
                (hasDiaryDailyActivity ? ' days — entries (geo vs non-geo)</b>' : ' days — geolocations</b>');

            var activeLookup = null;
            if (hasDiaryDailyActivity) {
                activeLookup = {};
                var arr = diaryDailyActivity[did] || [];
                for (var a = 0; a < arr.length; a++) activeLookup[arr[a]] = true;
            }

            for (var j = 0; j < daysDiary.length; j++) {
                var dayIso = daysDiary[j];
                var geoCount = (app && app.diaryGeoCountByDate && app.diaryGeoCountByDate[did] && app.diaryGeoCountByDate[did][dayIso]) || 0;
                if (hasDiaryDailyActivity) {
                    var isActive = !!(activeLookup && activeLookup[dayIso]);
                    var geo01 = geoCount > 0 ? 1 : 0;
                    var total01 = isActive ? 1 : 0;
                    html += app.barRow(dayIso.slice(5), geo01, total01, 1);
                } else {
                    html += app.barRow(dayIso.slice(5), geoCount, geoCount, scaleDiary);
                }
            }
            html += '</div>';
        }
        if (showTopPlaces) {
            var topPlaces = [];
            var getTopPlacesForDiary = options && options.getTopPlacesForDiary;
            if (typeof getTopPlacesForDiary === "function") {
                topPlaces = getTopPlacesForDiary(app, did, 5);
            }
            var topMax = topPlaces.length > 0 ? topPlaces[0].count : 1;
            html += '<div class="section"><b style="font-size:12px">Top 5 places (cumulative)</b>';
            for (var t = 0; t < topPlaces.length; t++) {
                var pct = Math.round((topPlaces[t].count / topMax) * 100);
                html += '<div class="bar-row">' +
                    '<span style="width:18px;text-align:right;margin-right:4px;flex-shrink:0;font-size:11px;color:#888">' + (t + 1) + '</span>' +
                    '<span class="bar-track" style="flex:0 0 45%"><span class="bar-geo" style="width:' + pct + '%"></span></span>' +
                    '<span style="font-size:11px;margin-left:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + topPlaces[t].count + ' ' + topPlaces[t].name + '</span>' +
                    '</div>';
            }
            html += '</div>';
        }

        return html;
    }
};
