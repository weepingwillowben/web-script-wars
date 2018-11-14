var create_utils = require('./create_utils.js')

function at(map, coord){
    return map[coord.y][coord.x]
}
function set(map, coord, val){
    map[coord.y][coord.x] = val
}
function consume_move(game_state, instr){
    var sc = instr.start_coord
    var ec = instr.end_coord
    var map = game_state.map
    var obj = at(map,sc)
    set(map,ec,obj)
    set(map,sc,create_utils.create_empty())
}
function consume_create(game_state, instr){
    set(game_state.map,instr.coord,instr.data)
}
function consume_status_change(game_state,instr){
    var unit = at(game_state.map, instr.coord)
    unit.status[instr.status_key] = instr.new_status
}
function consume_money_change(game_state,instr){
    game_state.players.player_info[instr.player].money = instr.amount;
}
function consume_set_active_player(){
    //this is a no-op because this functionality has to be handled elsewhere,
    //as gamestate does not hold active player information
}
function consume_add_equip(game_state,instr){
    var target = at(game_state.map,instr.coord)
    target.attachments.push(instr.equip_type)
}
var consume_funcs = {
    "MOVE": consume_move,
    "CREATE": consume_create,
    "ADD_EQUIPMENT": consume_add_equip,
    "SET_STATUS": consume_status_change,
    "SET_MONEY": consume_money_change,
    "SET_ACTIVE_PLAYER": consume_set_active_player,
}
function consume_change(gamestate, instr){
    consume_funcs[instr.type](gamestate,instr)
}

module.exports = {
    consume_change: consume_change,
}