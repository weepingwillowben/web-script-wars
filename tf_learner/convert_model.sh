
rm -r ../train_data/web_model/
(deactivate; workon tfconverter; tensorflowjs_converter \
    --input_format=tf_saved_model \
    --output_node_names='sig_out' \
    --saved_model_tags=serve \
    ../train_data/model_out/ \
    ../train_data/web_model/)

cp -r ../train_data/web_model/ ../static_files/

rm -r ../train_data/state_web_model/
(deactivate; workon tfconverter; tensorflowjs_converter \
    --input_format=tf_saved_model \
    --output_node_names='sig_out' \
    --saved_model_tags=serve \
    ../train_data/state_model/ \
    ../train_data/state_web_model/)

cp -r ../train_data/state_web_model/ ../static_files/
