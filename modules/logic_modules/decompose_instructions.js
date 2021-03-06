var create_utils = require('./create_utils.js')
var types = require('./types.js')
var base_ops = require("./base_ops.js")

function at(map, coord){
    var res = map[coord.y][coord.x]
    return res
}
function decomp_move(gamestate,instr,player){
    return [{
        type: "MOVE",
        start_coord: instr.start_coord,
        end_coord: instr.end_coord,
    },
    {
        type: "SET_STATUS",
        status_key: "moved",
        new_status: true,
        coord: instr.end_coord,
    }]
}
function decomp_attack(gamestate,instr,player){
    var decomp_list = [{
        type: "SET_STATUS",
        status_key: "attacked",
        new_status: true,
        coord: instr.source_coord,
    }]
    var source_unit = at(gamestate.map, instr.source_coord)
    var source_unit_attack = types.calc_stat(gamestate.stats,source_unit,"attack_strength")
    var target_unit = at(gamestate.map, instr.target_coord)
    var new_hp = target_unit.status.HP - source_unit_attack
    if(new_hp <= 0){
        //console.log(new_hp)
        decomp_list.push({
            type: "DESTROY_UNIT",
            coord: instr.target_coord,
        })
    }
    else{
        decomp_list.push({
            type: "SET_STATUS",
            status_key: "HP",
            new_status: new_hp,
            coord: instr.target_coord,
        })
    }
    return decomp_list
}
function decomp_build(gamestate,instr,player){
    return [{
        type: "CREATE",
        coord: instr.coord,
        data: create_utils.create_unit(instr.building_type,player),
    },{
        type: "SET_MONEY",
        player: player,
        amount: gamestate.players.player_info[player].money - gamestate.stats.unit_types[instr.building_type].cost,
    },{
        type: "SET_STATUS",
        status_key: "turns_til_active",
        new_status: gamestate.stats.unit_types[instr.building_type].activation_delay,
        coord: instr.coord,
    },]
}
function next_player(player_state, active_player){
    var idx = player_state.player_order.indexOf(active_player)
    var newidx = (idx + 1) % player_state.player_order.length
    var new_id = player_state.player_order[newidx]
    return new_id
}
function set_entry(entry_stack,entry,coord,key,new_value){
    if(entry.status[key] !== undefined && entry.status[key] !== new_value){
        entry_stack.push({
            type: "SET_STATUS",
            status_key: key,
            new_status: new_value,
            coord: coord,
        })
    }
}
function reset_status(reset_stack,unit,coord,stats,active_player){
    set_entry(reset_stack,unit,coord,"moved",false)
    set_entry(reset_stack,unit,coord,"attacked",false)
    var buys_per_turn = stats.unit_types[unit.unit_type].buys_per_turn
    if(buys_per_turn){
        set_entry(reset_stack,unit,coord,"buys_left",buys_per_turn)
    }
    set_entry(reset_stack,unit,coord,"HP",types.calc_stat(stats,unit,"max_HP"))
}
function all_status_resets(gamestate){
    var all_resets = []
    var active_player = gamestate.players.active_player
    base_ops.all_units_on_board(gamestate).forEach(function(centry){
        if(centry.unit.player === active_player){
            reset_status(all_resets,centry.unit,centry.coord,gamestate.stats)
            if(centry.unit.status.turns_til_active > 0){
                set_entry(all_resets,centry.unit,centry.coord,"turns_til_active",centry.unit.status.turns_til_active-1)
            }
        }
    })
    return all_resets
}
function winning_player(gamestate){
    //player wins if they have WIN_RATIO times more value of assets than their opponent,
    //or they have no physical assets, only cash
    var WIN_RATIO = 10
    var players_money = gamestate.players.player_order.map(function(player){
        var player_assets = types.get_player_cost(gamestate.stats,gamestate.map,player)
        var player_cash = gamestate.players.player_info[player].money
        var player_money = player_cash + player_assets

        //if player has no assets, then they are also lost, no matter how much cash
        if(player_assets === 0){
            player_money = 0
        }
        // is a player is deeply in debt, they also lose the game
        if(player_cash < -500){
            player_money = 0
        }
        return {player:player,money:player_money}
    })
    players_money.sort(function(a,b){
        return b.money - a.money
    })
    if(players_money[0].money > players_money[1].money*WIN_RATIO){
        return players_money[0].player
    }
    else{
        return null
    }
}
function decomp_endturn(gamestate,instr,player){
    var win_player = winning_player(gamestate)
    if(win_player !== null){
        return [{
            type: "VICTORY",
            win_player: win_player,
        }]
    }
    var status_resets = all_status_resets(gamestate)
    var money_entry = {
        type: "SET_MONEY",
        player: player,
        amount: gamestate.players.player_info[player].money + base_ops.get_current_income(gamestate,player),
    }
    var active_entry = {
        type: "SET_ACTIVE_PLAYER",
        player: next_player(gamestate.players,player),
    }
    var total_list = status_resets.concat([money_entry,active_entry])
    return total_list
}
function decomp_buy_unit(gamestate,instr,player){
    return [{
        type: "CREATE",
        coord: instr.placement_coord,
        data: create_utils.create_unit(instr.buy_type,player),
    }, {
        type: "SET_MONEY",
        player: player,
        amount: gamestate.players.player_info[player].money - gamestate.stats.unit_types[instr.buy_type].cost,
    }, {
        type: "SET_STATUS",
        status_key: "buys_left",
        new_status: at(gamestate.map,instr.building_coord).status.buys_left - 1,
        coord: instr.building_coord,
    },{
        type: "SET_STATUS",
        status_key: "turns_til_active",
        new_status: gamestate.stats.unit_types[instr.buy_type].activation_delay,
        coord: instr.placement_coord,
    },]
}
function decomp_buy_attachment(gamestate,instr,player){
    return [{
           type: "SET_MONEY",
           player: player,
           amount: gamestate.players.player_info[player].money - gamestate.stats.attachment_types[instr.equip_type].cost,
       }, {
           type: "SET_STATUS",
           status_key: "buys_left",
           new_status: at(gamestate.map,instr.building_coord).status.buys_left - 1,
           coord: instr.building_coord,
       }, {
           type: "ADD_EQUIPMENT",
           equip_type: instr.equip_type,
           coord: instr.equip_coord,
       }, {
           type: "SET_STATUS",
           status_key: "moved",
           new_status: true,
           coord: instr.equip_coord,
       }, {
           type: "SET_STATUS",
           status_key: "attacked",
           new_status: true,
           coord: instr.equip_coord,
       }]
}
function decomp_init_game(gamestate,instr,player){
    var money_setups = instr.player_order.map(function(player){return{
           type: "SET_MONEY",
           player: player,
           amount: instr.initial_money,
    }})

    var all_resets = []
    instr.initial_creations.forEach(function(centry){
        if(centry.type === "CREATE"){
            reset_status(all_resets,centry.data,centry.coord,instr.stats)
            set_entry(all_resets,centry.data,centry.coord,"turns_til_active",0)
        }
    })
    return [{
            type: "INIT_GAME_STATE",
            player_order: instr.player_order,
            stats: instr.stats,
            game_size: instr.game_size,
        },{
            type: "SET_ACTIVE_PLAYER",
            player: instr.player_order[0],
        }].concat(money_setups)
          .concat(instr.initial_creations)
          .concat(all_resets)
}
var decomp_funcs = {
    "MOVE": decomp_move,
    "ATTACK": decomp_attack,
    "BUILD": decomp_build,
    "BUY_UNIT": decomp_buy_unit,
    "END_TURN": decomp_endturn,
    "BUY_ATTACHMENT": decomp_buy_attachment,
    "GAME_STARTED": decomp_init_game,
}
function decompose_instructions(gamestate,instr,player){
    return decomp_funcs[instr.type](gamestate,instr,player)
}
module.exports = {
    decompose_instructions: decompose_instructions,
}
