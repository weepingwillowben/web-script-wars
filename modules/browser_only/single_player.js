var types = require("../logic_modules/types.js")
var info_display = require("./game_display/info_display.js")
var signals = require("./game_display/global_signals.js")
var validate = require("../logic_modules/validate_instruction.js")
var decompose = require("../logic_modules/decompose_instructions.js")
var consume = require("../logic_modules/consume_instructions.js")
var init_game = require("../logic_modules/init_game.js")
var game_page = require("./game_page.js")
var nav_signal = require("./nav_signal.js")

var single_player_players = [
    "Player A",
    "Player B",
]

function process_instruction_backend(game_state,instruction,player){
    var instr_parts = decompose.decompose_instructions(game_state,instruction,player)
    instr_parts.forEach(function(part){
        //change local game state
        consume.consume_change(game_state,part)
        //display instruction on canvas
        signals.gameStateChange.fire(part)
    })
}
function process_instruction(game_state,instruction,player){
    game_page.process_message_frontend(game_state,instruction,player,process_instruction_backend)
}
var player_frontend_data = {}
function init_player_frontend_data(player_order){
    var lib_data = document.getElementById("default_lib_src").innerHTML
    var data_data = JSON.parse(document.getElementById("default_data_src").innerHTML)
    var layout_data = JSON.parse(document.getElementById("default_layout_src").innerHTML)
    player_order.forEach(function(player){
        player_frontend_data[player] = {
            lib_data: lib_data,
            data_data: data_data,
            layout_data: layout_data,
            selected_item: layout_data[0][0].id
        }
    })
}
function init_signals(game_state){
    signals.clear_all_signals()
    game_page.init_signals(game_state)
    signals.ended_turn.listen(() => {
        process_instruction_backend(game_state,{type:"END_TURN"},signals.myPlayer.getState())
        var myplayer = signals.myPlayer.getState()
        //var old_sel_state = player_frontend_data[myplayer].selected_item
        signals.libData.setState(player_frontend_data[myplayer].lib_data)
        signals.layoutChanged.setState(player_frontend_data[myplayer].layout_data)
        signals.buttonData.setState(player_frontend_data[myplayer].data_data)
        //signals.selectedData.setState(old_sel_state)
        //console.log("state reset to: "+old_sel_state)
    })
    signals.selectedData.listen(function(newstate){
        var myplayer = signals.myPlayer.getState()
        if(myplayer){
            //console.log("set state to: "+newstate)
            player_frontend_data[myplayer].selected_item = newstate
        }
    })
    signals.libData.listen(function(newstate){
        var myplayer = signals.myPlayer.getState()
        if(myplayer){
            player_frontend_data[myplayer].lib_data = newstate
        }
    })
    signals.layoutChanged.listen(function(newstate){
        var myplayer = signals.myPlayer.getState()
        if(myplayer){
            player_frontend_data[myplayer].layout_data = newstate
        }
    })
    signals.buttonData.listen(function(newstate){
        var myplayer = signals.myPlayer.getState()
        if(myplayer){
            player_frontend_data[myplayer].data_data = newstate
        }
    })
    signals.activePlayer.listen(function(newstate){
        signals.myPlayer.setState(newstate)
    })
    signals.gameStateChange.listen(function(change){
        if (change.type === "VICTORY") {
            info_display.make_info_display("Player: '" +change.win_player+"' won the game.")
        }
    })
}
function execute_init_instr(gamesize,game_state){
    var player_order = single_player_players
    var init_instr = {
        type: "GAME_STARTED",
        game_size: gamesize,
        initial_creations: init_game.place_initial_units(gamesize,player_order),
        player_order: player_order,
        initial_money: 100,
        stats: types.default_stats,
    }
    process_instruction(game_state,init_instr,"__server")
    signals.selectedData.setState(signals.selectedData.getState())
}
function create_single_player(){
    var gamesize = {
        xsize: 45,
        ysize: 40,
    }
    var game_state = {
        players: null,
        map: null,
        stats: null,
    }
    init_player_frontend_data(single_player_players)
    init_signals(game_state)

    game_page.set_worker_callback(function(message){
        process_instruction(game_state,message,signals.myPlayer.getState())
    })
    game_page.init_html_ui(gamesize,single_player_players)
    game_page.init_web_worker()
    execute_init_instr(gamesize,game_state)
    nav_signal.change_page.fire("game_naventry")
}

module.exports = {
    create_single_player: create_single_player,
}
