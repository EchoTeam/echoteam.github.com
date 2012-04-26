/* Items in Echo Stream Client */
Echo.Localization.extend({
  "defaultModeSwitchTitle": "Переключиться в метарежим",
  "guest": "Гость",
  "today": "Сегодня",
  "yesterday": "Вчера",
  "lastWeek": "На прошлой неделе",
  "lastMonth": "В прошлом месяце",
  "secondAgo": "секунду назад",
  "secondsAgo": "секунд назад",
  "minuteAgo": "минуту назад",
  "minutesAgo": "минут назад",
  "hourAgo": "час назад",
  "hoursAgo": "часов назад",
  "dayAgo": "день назад",
  "daysAgo": "дней назад",
  "weekAgo": "неделю назад",
  "weeksAgo": "недель назад",
  "metadataModeSwitchTitle": "Переключиться в обычный режим",
  "monthAgo": "месяц назад",
  "monthsAgo": "месяцев назад",
  "sharedThisOn": "Я поделился этим в {service}...",
  "userID": "Id пользователя:",
  "fromLabel": "через",
  "viaLabel": "через",

  "loading": "Показываю...",
  "childrenMoreItems": "Показать остальные"
}, "Item");

/* Echo Stream Client controls */
Echo.Localization.extend({
  "guest": "Гость",
  "live": "Обновляется",
  "paused": "Приостановлено",
  "more": "Еще",
  "loading": "Одну минуточку...",
  "emptyStream": "Здесь пока никто ничего не написал.",
  "waiting": "Одну минуточку (обновляем поток)...",
  "new": "новых"
}, "Stream");

/* Echo Submit Form */
Echo.Localization.extend({
  "actionString": "Ваш комментарий",
  "createdBy": "Создано",
  "loading": "Одну минуточку...",
  "markers": "Маркеры:",
  "markersHint": "маркер1, маркер2, маркер3, ...",
  "on": "on",
  "post": "Отправить",
  "posting": "Отправляется...",
  "tagsHint": "Тег1, тег2, тег3, ...",
  "tags": "Теги:",
  "update": "Обновить",
  "updating": "Обновляется...",
  "yourName": "Ваше имя (обязательно)",
  "yourWebsiteOptional": "Ваш веб-сайт (необязательно)"
}, "Submit");

/* Echo Auth controls */
Echo.Localization.extend({
  "edit": "Перевойти",
  "loading": "Одну минуточку...",
  "login": "Войти",
  "logout": "Выйти",
  "loggingOut": "Выхожу...",
  "or": "или",
  "signup": "Зарегистрироваться"
}, "Auth");

Echo.Localization.extend({
  "youMustBeLoggedIn": "Войдите, чтобы комментировать"
}, "Plugins.FormAuth");

Echo.Localization.extend({
  "replyControl": "Ответить"
}, "Plugins.Reply");

$(function() {
    var appkey = "uldev.js-kit.com";

    var identityWindow = {
        "width": 420,
        "height": 260,                                                                                                                             
        "url": "https://echo.rpxnow.com/openid/embed"
             + "?flags=stay_in_window,no_immediate"
             + "&token_url=http%3A%2F%2Fjs-kit.com%2Fapps%2Fjanrain%2Fwaiting.html"
             + "&bp_channel="
    };
    
    var formAuth = {
        "name": "FormAuth",
        "identityManagerLogin": identityWindow,
        "identityManagerSignup": identityWindow,
        "identityManagerEdit": identityWindow,
        "submitPermissions": "forceLogin"
    };

    Backplane.init({
        "serverBaseURL" : "http://api.echoenabled.com/v1",
        "busName": "jskit"
    });

    function suffix(c) {
        return (c%100 === 11 || c%100 === 12 || c%100 === 13 || c%100 === 14) ? "иев"
             : (c%10  === 1) ? "ий"
             : (c%10  === 2  || c%10  === 3  || c%10  === 4) ? "ия"
             : "иев"; 
    }

    Echo.Broadcast.subscribe("Counter.onUpdate", function(topic, data, contextId) {
        var c = data.data.count;
        var $target = $(data.target);
        $target.html(c + " комментар" + suffix(c));
    });

    var authorTweaks = Echo.createPlugin({
        "name": "AuthorTweaks",
        "applications": ["Stream"],
        "init": function(plugin, application) {
            plugin.extendTemplate("Item", "<span></span>", "replace", "echo-item-authorName");
            plugin.extendTemplate("Item", '<div class="echo-item-authorName"></div>', 'insertBefore', 'echo-item-date');
            plugin.extendTemplate("Item", '<div class="echo-item-control-delim"> · </div>', 'insertBefore', 'echo-item-date');
        }
    });

    $(".comments__stream").each(function() {
        var $target = $(this);
        var scope = $target.attr("data-url");

        new Echo.Stream({
            "target": $target,
            "appkey": appkey,
            "query": "childrenof:" + scope
                   + " -state:SystemFlagged,ModeratorFlagged"
                   + " sortOrder:chronological"
                   + " children:1"
                   + " -state:SystemFlagged,ModeratorFlagged"
                   + " childrenSortOrder:chronological"
                   + " childrenItemsPerPage:10",
            "viaLabel": { "icon": true, "text": true },
            "plugins": [{
                "name": "Reply",
                "actionString": "Ваш комментарий...",
                "nestedPlugins": [formAuth]
            },
            authorTweaks]
        });
    });

    $(".comments__submit").each(function() {
        var $target = $(this);
        var scope = $target.attr("data-url");

        new Echo.Submit({
            "target": $target,
            "appkey": appkey,
            "targetURL": scope,
            "actionString": "Ваш комментарий...",
            "plugins": [formAuth]
        });
    });

     $(".comments_counter").each(function() {
        var $target = $(this);
        var url = $target.attr('data-url');
        var q = "childrenof:" + url
              + " -state:SystemFlagged,ModeratorFlagged";

        new Echo.Counter({
            "target": $target,
            "appkey": appkey,
            "query": q,
            "liveUpdates": false
        });
    });

});
