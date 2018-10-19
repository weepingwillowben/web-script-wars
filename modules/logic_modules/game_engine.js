var CMath = require('./coord_engine.js')
var game_config = require("./types.js")

var x_size = 20;
var y_size = 10;
var num_players = 2;

function init_game(){
    CMath.set_size(x_size,y_size)
    var game = new Array(y_size)
    for(var i = 0; i < y_size; i++){
        game[i] = new Array(x_size)
        for(var j = 0; j < x_size; j++){
            game[i][j] = create_empty()
        }
    }
    place_initial_units(game)
    return game
}
function create_empty(){
    return {
        "category": "empty"
    }
}
function get_player_start_coords(){
    var min_dist_from_borders = 3
    var min_dist_from_players = 5
    var player_centers = [];
    for(var i = 0; i < num_players; i++){
        var center;
        do {
            center = CMath.random_coord()
        } while (CMath.min_distance(center,player_centers) < min_dist_from_players ||
                CMath.dist_border(center) < min_dist_from_borders);
        player_centers.push(center)
    }
    return player_centers
}
function place_initial_units(game_data){
    var centers = get_player_start_coords()
    for(var i = 0; i < num_players; i++){
        var cen = centers[i]
        game_data[cen.y][cen.x] = create_unit("soldier",game_config.unit_types['soldier'],i)
    }
}
function create_unit(unit_type,unit_info,player_id){
    return {
        "category": "unit",
        "player": player_id,
        "type": unit_type,
        "stats": unit_info['stats'],
        "icon": unit_info['icon'],
    }
}
module.exports = {
    init_game: init_game,
}