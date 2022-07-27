/*
Template Name: Minible - Admin & Dashboard Template
Author: Themesbrand
Version: 2.0.0
Website: https://themesbrand.com/
Contact: themesbrand@gmail.com
File: Main Js File
*/

var socket = io();

let newsContent = '';

socket.on('news_updated', function(msg) {
    console.log('session_created:', msg);

    // toastr.options = {
    //   "closeButton": true,
    //   "debug": false,
    //   "newestOnTop": false,
    //   "progressBar": true,
    //   "positionClass": "toast-top-right",
    //   "preventDuplicates": false,
    //   "onclick": null,
    //   "showDuration": "300",
    //   "hideDuration": "1000",
    //   "timeOut": "5000",
    //   "extendedTimeOut": "1000",
    //   "showEasing": "swing",
    //   "hideEasing": "linear",
    //   "showMethod": "fadeIn",
    //   "hideMethod": "fadeOut"
    // }
    //
    // toastr["info"](msg.content, "Live");

    if (!$('#tickerWrap').hasClass('show')) $('#tickerWrap').addClass('show');
    if (newsContent != msg.content) {
        setTimeout(function() {
            $('#tickerContent').html('<div class="ticker__item">' + msg.content + '</div>');
        }, 1000);
        newsContent = msg.content;
    }
});

socket.on('session_ended', function(msg) {
    setTimeout(function() {
        if ($('#tickerWrap').hasClass('show')) $('#tickerWrap').removeClass('show');
        $('#tickerContent').html('');
        newsContent = '';
    }, 20000)
});

function initProfileRightbar() {
    // right side-bar toggle
    $('.profile-right-bar-toggle').on('click', function (e) {
        var teleId = $(this).data('id');
        if (!$('body').hasClass('profile-right-bar-enabled') && teleId) {
            $('#loadingContainer').removeClass('hidden');
            $.ajax({
                type: 'GET',
                url: "/api/get-profile?id=" + teleId,
                dataType: "json",
                success: function(res) {

                    let user = res.teleUser;
                    let result = res.result;
                    let joinDate = res.joinDate;
                    let rank = res.rank;
                    let sessionCount = res.sessionCount;
                    let rResult = res.rResult;
                    let motto = res.motto;
                    let totalFortuna = res.totalFortuna;
                    let countryCode = res.countryCode;
                    let mySkills = res.mySkills;
                    let totalPoint = res.totalPoint;
                    let missions = res.missions;
                    let tournaments = res.tournaments;

                    let coptions = {
                        // defaultCountry: "jp",
                        // onlyCountries: ['us', 'gb', 'ch', 'ca', 'do'],
                        // responsiveDropdown: true,
                        preferredCountries: ['ca', 'gb', 'us']
                    };
                    if (countryCode) {
                        coptions.defaultCountry = countryCode;
                        $("#country_selector").countrySelect(coptions);
                        $('#profileRightCountry').removeClass('hidden');
                    } else {
                        $('#profileRightCountry').addClass('hidden');
                    }

                    let skillHtml = '';
                    let skills = Object.keys(mySkills);
                    let isExist = false;
                    for (let i = 0; i < skills.length; i ++) {
                        if (mySkills[skills[i]] > 0) {
                            isExist = true;
                            skillHtml += '<div class="skill-item"><img src="/public/assets/images/skills/' + skills[i] + '.png" title="' + skills[i] + '"/><span>' + mySkills[skills[i]] + '</span></div>'
                        }
                    }
                    if (isExist) {
                        $('#profileRightSkills').html(skillHtml);
                    } else {
                        $('#profileRightSkills').html('No Skills');
                    }

                    $('#profile-side-title-img').attr('src', '/public/assets/images/title/' +  (user.title.toLowerCase()) + '.jpg');
                    $('#profile-side-title-img').attr('alt', user.username);
                    $('#profile-side-username').html(user.username);
                    $('#profile-side-motto').html(motto);
                    $('#profile-side-fortuna').html('<img src="/public/assets/images/fortuna-icon.jpg" alt="Overall Fortuna" style="width: 20px; height: 20px;" title="Overall Fortuna"/> ' + totalFortuna.toFixed(1));
                    // $('#profile-side-telegramId').html('Telegram ID: ' + user.telegramId);

                    if (joinDate) {
                        $('#profile-side-joindate').removeClass('hidden');
                        $('#profile-side-joindate').html('Joined At: ' + joinDate);
                    }

                    if (missions.length > 0) {
                        $('#profile-side-mission').removeClass('hidden');
                        let html = '';
                        for (let i = 0; i < missions.length; i ++) {
                            let mission = missions[i];
                            html += '<div class="mission-item" style="float: left; margin-right: 10px;">\n' +
                                '                                    <img class="rounded-circle avatar-lg" src="/uploads/' + mission.mission.badge + '"\n' +
                                '                                         data-holder-rendered="true" data-xblocker="passed" style="visibility: visible;">\n' +
                                '                                </div>'
                        }
                        $('#profile-side-mission-container').html(html);
                    }

                    if (tournaments.length > 0) {
                        $('#profile-side-tournament').removeClass('hidden');
                        let html = '';
                        for (let i = 0; i < tournaments.length; i ++) {
                            let tournament = tournaments[i];
                            html += '<div class="mission-item" style="float: left; margin-right: 10px;">\n' +
                                '                                    <img class="rounded-circle avatar-lg" src="/uploads/' + tournament.badge + '"\n' +
                                '                                         data-holder-rendered="true" data-xblocker="passed" style="visibility: visible;">\n' +
                                '                                </div>'
                        }
                        $('#profile-side-tournament-container').html(html);
                    }

                    $('#profile-side-overall').removeClass('hidden');
                    $('#profile-side-overall').html('Overall Points: ' + totalPoint);

                    $('#profile-side-rank').html('Overall Rank: ' + rank);

                    $('#profile-right-1st-rank').html('<img src="/public/assets/images/gold-cup.png" style="width: 20px; height: 20px; margin-right: 5px;"/> ' + rResult[0].count  + ' time' + (rResult[0] > 1 ? 's' : ''))
                    $('#profile-right-2nd-rank').html('<img src="/public/assets/images/silver-cup.png" style="width: 20px; height: 20px; margin-right: 5px;"/> ' + rResult[1].count  + ' time' + (rResult[1] > 1 ? 's' : ''))
                    $('#profile-right-3rd-rank').html('<img src="/public/assets/images/third-cup.png" style="width: 20px; height: 20px; margin-right: 5px;"/> ' + rResult[2].count  + ' time' + (rResult[2] > 1 ? 's' : ''))

                    if (rResult[0].count >= 50) $('#lockTrophy50').addClass('hidden'); else $('#lockTrophy50').removeClass('hidden');
                    if (rResult[0].count >= 100) $('#lockTrophy100').addClass('hidden'); else  $('#lockTrophy100').removeClass('hidden');
                    if (rResult[0].count >= 150) $('#lockTrophy150').addClass('hidden'); else $('#lockTrophy150').removeClass('hidden');

                    let tbody = '<table id="profileSideTable" class="table table-bordered dt-responsive nowrap" style="border-collapse: collapse; border-spacing: 0; width: 100%;">'
                    tbody +='<thead><tr><th>Session No</th><th>Session Name</th><th>Points</th><th>Rank</th></tr></thead><tbody>';
                    for (let i = 0; i < result.length; i ++) {
                        let ritem = result[i];
                        tbody += '<tr>';
                        tbody += '<th scope="row">' + ritem.session_no + '</th>'
                        tbody += '<td>' + (ritem.session ? ritem.session.session_name : '') + '</td>'
                        tbody += '<td>' + ritem.session_points + '</td>';
                        tbody += '<td>' + ritem.session_rank + '</td>'
                        tbody += '</tr>';
                    }
                    tbody += '</tbody>';

                    $('#profile-side-history').html(tbody);
                    $('#profileSideTable').DataTable({
                        order: [[0, 'desc']],
                    });

                    let allCount = sessionCount * 1;
                    let attendCount = result.length;

                    console.log(allCount, attendCount);

                    let options = {
                        chart: {
                            height: 320,
                            type: 'pie',
                        },
                        series: [attendCount, allCount - attendCount],
                        labels: ["Attended", "Not Attended"],
                        colors: ["#34c38f", "#5b73e8"],
                        legend: {
                            show: true,
                            position: 'bottom',
                            horizontalAlign: 'center',
                            verticalAlign: 'middle',
                            floating: false,
                            fontSize: '14px',
                            offsetX: 0
                        },
                        responsive: [{
                            breakpoint: 600,
                            options: {
                                chart: {
                                    height: 240
                                },
                                legend: {
                                    show: false
                                },
                            }
                        }]

                    }

                    var chart = new ApexCharts(
                        document.querySelector("#profile_side_pie_chart"),
                        options
                    );

                    chart.render();

                    $('#profile-side-attend').html('Attended: ' + (result.length / sessionCount * 100).toFixed(1) + '%')
                    $('#profile-side-unattend').html('Not Attended: ' + (100 - result.length / sessionCount * 100).toFixed(1) + '%')

                    $('#loadingContainer').addClass('hidden');
                    $('body').addClass('profile-right-bar-enabled');
                }
            });
        } else {
            $('body').removeClass('profile-right-bar-enabled');
        }
    });

    $(document).on('click', 'body', function (e) {
        if ($(e.target).closest('.profile-right-bar-toggle, .profile-right-bar').length > 0) {
            return;
        }

        $('body').removeClass('profile-right-bar-enabled');
        return;
    });
}

(function ($) {

    'use strict';

    function initMetisMenu() {
        //metis menu
        $("#side-menu").metisMenu();
    }

    function initLeftMenuCollapse() {
        $('.vertical-menu-btn').on('click', function (event) {
            event.preventDefault();
            $('body').toggleClass('sidebar-enable');
            if ($(window).width() >= 992) {
                $('body').toggleClass('vertical-collpsed');
            } else {
                $('body').removeClass('vertical-collpsed');
            }
        });
    }

    function initActiveMenu() {
        // === following js will activate the menu in left side bar based on url ====
        $("#sidebar-menu a").each(function () {
            var pageUrl = window.location.href.split(/[?#]/)[0];
            if (this.href == pageUrl) {
                $(this).addClass("active");
                $(this).parent().addClass("mm-active"); // add active to li of the current link
                $(this).parent().parent().addClass("mm-show");
                $(this).parent().parent().prev().addClass("mm-active"); // add active class to an anchor
                $(this).parent().parent().parent().addClass("mm-active");
                $(this).parent().parent().parent().parent().addClass("mm-show"); // add active to li of the current link
                $(this).parent().parent().parent().parent().parent().addClass("mm-active");
            }
        });
    }

    function initMenuItemScroll() {
        // focus active menu in left sidebar
        $(document).ready(function(){
            if($("#sidebar-menu").length > 0 && $("#sidebar-menu .mm-active .active").length > 0){
                var activeMenu = $("#sidebar-menu .mm-active .active").offset().top;
                if( activeMenu > 300) {
                    activeMenu = activeMenu - 300;
                    $(".vertical-menu .simplebar-content-wrapper").animate({ scrollTop: activeMenu }, "slow");
                }
            }
        });
    }

    function initHoriMenuActive() {
        $(".navbar-nav a").each(function () {
            var pageUrl = window.location.href.split(/[?#]/)[0];
            if (this.href == pageUrl) {
                $(this).addClass("active");
                $(this).parent().addClass("active");
                $(this).parent().parent().addClass("active");
                $(this).parent().parent().parent().addClass("active");
                $(this).parent().parent().parent().parent().addClass("active");
                $(this).parent().parent().parent().parent().parent().addClass("active");
            }
        });
    }

    function initFullScreen() {
        $('[data-bs-toggle="fullscreen"]').on("click", function (e) {
            e.preventDefault();
            $('body').toggleClass('fullscreen-enable');
            if (!document.fullscreenElement && /* alternative standard method */ !document.mozFullScreenElement && !document.webkitFullscreenElement) {  // current working methods
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                }
            } else {
                if (document.cancelFullScreen) {
                    document.cancelFullScreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }
            }
        });
        document.addEventListener('fullscreenchange', exitHandler);
        document.addEventListener("webkitfullscreenchange", exitHandler);
        document.addEventListener("mozfullscreenchange", exitHandler);
        function exitHandler() {
            if (!document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
                console.log('pressed');
                $('body').removeClass('fullscreen-enable');
            }
        }
    }

    function initRightSidebar() {
        // right side-bar toggle
        $('.right-bar-toggle').on('click', function (e) {
            $('body').toggleClass('right-bar-enabled');
        });

        $(document).on('click', 'body', function (e) {
            if ($(e.target).closest('.right-bar-toggle, .right-bar').length > 0) {
                return;
            }

            $('body').removeClass('right-bar-enabled');
            return;
        });
    }

    function initDropdownMenu() {
        if(document.getElementById("topnav-menu-content")){
            var elements = document.getElementById("topnav-menu-content").getElementsByTagName("a");
            for(var i = 0, len = elements.length; i < len; i++) {
                elements[i].onclick = function (elem) {
                    if(elem.target.getAttribute("href") === "#") {
                        elem.target.parentElement.classList.toggle("active");
                        elem.target.nextElementSibling.classList.toggle("show");
                    }
                }
            }
            window.addEventListener("resize", updateMenu);
        }
    }

    function updateMenu() {
        var elements = document.getElementById("topnav-menu-content").getElementsByTagName("a");
        for(var i = 0, len = elements.length; i < len; i++) {
            if(elements[i].parentElement.getAttribute("class") === "nav-item dropdown active") {
                elements[i].parentElement.classList.remove("active");
                elements[i].nextElementSibling.classList.remove("show");
            }
        }
    }

    function initComponents() {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        });

        var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
        var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl)
        });

        // Counter Up
        var delay = $(this).attr('data-delay') ? $(this).attr('data-delay') : 100; //default is 100
        var time = $(this).attr('data-time') ? $(this).attr('data-time') : 1200; //default is 1200
        $('[data-plugin="counterup"]').each(function (idx, obj) {
            $(this).counterUp({
                delay: delay,
                time: time
            });
        });
    }

    function initPreloader() {
        $(window).on('load', function () {
            $('#status').fadeOut();
            $('#preloader').delay(350).fadeOut('slow');
        });
    }



    function initSettings() {
        if (window.sessionStorage) {
            var alreadyVisited = sessionStorage.getItem("is_visited");
            if (!alreadyVisited) {
                sessionStorage.setItem("is_visited", "light-mode-switch");
            } else {
                $(".right-bar input:checkbox").prop('checked', false);
                $("#" + alreadyVisited).prop('checked', true);
                updateThemeSetting(alreadyVisited);
            }
        }
        $("#light-mode-switch, #dark-mode-switch, #rtl-mode-switch").on("change", function (e) {
            updateThemeSetting(e.target.id);
        });
    }

    function updateThemeSetting(id) {
        if ($("#light-mode-switch").prop("checked") == true && id === "light-mode-switch") {
            $("html").removeAttr("dir");
            $("#dark-mode-switch").prop("checked", false);
            $("#rtl-mode-switch").prop("checked", false);
            $("#bootstrap-style").attr('href', '/public/assets/css/bootstrap.min.css');
            $("#app-style").attr('href', '/public/assets/css/app.min.css');
            sessionStorage.setItem("is_visited", "light-mode-switch");
        } else if ($("#dark-mode-switch").prop("checked") == true && id === "dark-mode-switch") {
            $("html").removeAttr("dir");
            $("#light-mode-switch").prop("checked", false);
            $("#rtl-mode-switch").prop("checked", false);
            $("#bootstrap-style").attr('href', '/public/assets/css/bootstrap-dark.min.css');
            $("#app-style").attr('href', '/public/assets/css/app-dark.min.css');
            sessionStorage.setItem("is_visited", "dark-mode-switch");
        } else if ($("#rtl-mode-switch").prop("checked") == true && id === "rtl-mode-switch") {
            $("#light-mode-switch").prop("checked", false);
            $("#dark-mode-switch").prop("checked", false);
            $("#bootstrap-style").attr('href', '/public/assets/css/bootstrap-rtl.min.css');
            $("#app-style").attr('href', '/public/assets/css/app-rtl.min.css');
            $("html").attr("dir", 'rtl');
            sessionStorage.setItem("is_visited", "rtl-mode-switch");
        }
    }

    function init() {
        initMetisMenu();
        initLeftMenuCollapse();
        initActiveMenu();
        initMenuItemScroll();
        initFullScreen();
        initHoriMenuActive();
        initRightSidebar();
        initProfileRightbar();
        initDropdownMenu();
        initComponents();
        initSettings();
        initPreloader();
        Waves.init();
    }

    init();

})(jQuery)

function formatDateFromString(d) {
    let month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    let hours = d.getHours();
    let minutes = d.getMinutes();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (hours * 1 < 10) hours = '0' + hours;
    if (minutes * 1 < 10) minutes = '0' + minutes;



    return [year, month, day].join('-') + ' ' + hours + ':' + minutes;
}

$(document).ready(function() {
    let toffset = new Date().getTimezoneOffset();
    $('.format-date').each(function() {
        let t = new Date($(this).html());
        t.setTime(t.getTime() - toffset * 60 * 1000);
        t = formatDateFromString(t);
        $(this).html(t);
    });

    $('.format-date-input').each(function() {
        let t = new Date($(this).val());
        t.setTime(t.getTime() - toffset * 60 * 1000);
        t = formatDateFromString(t);
        $(this).val(t);
    });
})