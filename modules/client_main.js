var display_board = require("./browser_only/display_board.js")

var signup_login = require("./browser_only/signup_login.js")
var rankings_page = require("./browser_only/rankings_page.js")
var live_connections = require("./browser_only/live_connections_page.js")
var game_page = require("./browser_only/game_page.js")
//var multi_player = require("./browser_only/multiplayer.js")

var peer_con = null;

function switch_away_from_all(){
    live_connections.switch_away_from_live_games()
    game_page.switch_away_from_game_page()
}
function setup_page_navigation(){
    $("#signup_naventry").click(function(){
        switch_away_from_all()
        signup_login.switch_to_signup()
    })
    $("#login_naventry").click(function(){
        switch_away_from_all()
        signup_login.switch_to_login()
    })
    $("#logout_naventry").click(function(){
        signup_login.logout()
    })
    $("#rankings_naventry").click(function(){
        switch_away_from_all()
        rankings_page.switch_to_rankings()
    })
    $("#live_connect_naventry").click(function(){
        switch_away_from_all()
        live_connections.switch_to_live_games()
    })
    $("#game_naventry").click(function(){
        switch_away_from_all()
        game_page.switch_to_game_page()
    })
}

function init_all(){
    setup_page_navigation()
    signup_login.init_signup_login()
    rankings_page.init_rankings()
    live_connections.init_live_games()
    game_page.init_game_page()
    //single_player.init_single_player()
    //multi_player.init_multi_player()
}

window.onload = function(){
    init_all()
    live_connections.switch_to_live_games()
}
