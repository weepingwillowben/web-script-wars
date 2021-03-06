# obviously required to set up permissions first
aws s3 cp static_files/index.html.gz s3://script-wars-deploy/index.html --content-encoding gzip
aws s3 cp static_files/tf.min.js.gz s3://script-wars-deploy/tf.min.js --content-encoding gzip
aws s3 cp --recursive static_files/state_web_model/ s3://script-wars-deploy/state_web_model/
aws s3 cp --recursive static_files/web_model/ s3://script-wars-deploy/web_model/
#aws s3 cp static_files/tf.min.js.gz s3://script-wars-deploy/tf.min.js --content-encoding gzip
for f in static_files/game_records/*.gz; do
    FNAME="$(echo "$f" | sed 's:static_files/game_records/::' | sed 's/.gz//' )";
    #echo $FNAME;
    aws s3 cp $f s3://script-wars-deploy/game_records/$FNAME --content-encoding gzip;
done
