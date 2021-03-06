import numpy as np
import tensorflow as tf
import argparse
import random
import os
import shutil

def unpool2x2(input,orig_shape):
    base_shape = input.get_shape().as_list()
    batch_size = tf.shape(input)[0]
    reshaped_pool = tf.reshape(input,[batch_size,base_shape[1],base_shape[2],1,base_shape[3]])
    x_concatted = tf.concat([reshaped_pool,reshaped_pool],3)
    x_reshaped = tf.reshape(x_concatted,[batch_size,base_shape[1],1,base_shape[2]*2,base_shape[3]])
    y_concatted = tf.concat([x_reshaped,x_reshaped],2)
    y_reshaped = tf.reshape(y_concatted,[batch_size,base_shape[1]*2,base_shape[2]*2,base_shape[3]])
    #sliced = y_reshaped[:,:orig_shape[1],:orig_shape[2]]
    sliced = tf.slice(y_reshaped,[0,0,0,0],[batch_size,orig_shape[1],orig_shape[2],base_shape[3]])
    return sliced

def lay_pool_skip_method(input):
    lay1size = 64
    CONV1_SIZE=[3,3]
    POOL_SIZE=[2,2]
    POOL_STRIDES=[2,2]
    DEPTH=3
    basic_outs = []
    orig_reduction = tf.layers.dense(
        inputs=input,
        units=lay1size,
        activation=tf.nn.relu
    )
    cur_out = orig_reduction
    for x in range(DEPTH):
        lay1_outs = tf.layers.conv2d(
            inputs=cur_out,
            filters=lay1size,
            kernel_size=CONV1_SIZE,
            padding="same",
            activation=tf.nn.relu)
        lay_1_pool = tf.layers.average_pooling2d(
            inputs=lay1_outs,
            pool_size=POOL_SIZE,
            strides=POOL_STRIDES,
            padding='same',
        )
        basic_outs.append(lay1_outs)
        cur_out = lay_1_pool
        print(lay_1_pool.shape)

    old_val = basic_outs[DEPTH-1]
    for y in range(DEPTH-2,-1,-1):
        skip_val = basic_outs[y]
        depooled = unpool2x2(old_val,skip_val.get_shape().as_list())
        base_val = depooled + skip_val
        old_val = base_val
        print(depooled.shape,)


    combined_input = old_val+orig_reduction
    refine_layer1 = tf.layers.dense(
        inputs=combined_input,
        units=lay1size,
        activation=tf.nn.relu
    )
    refine_layer3 = tf.layers.dense(
        inputs=refine_layer1,
        units=1
    )
    return tf.squeeze(refine_layer3)


def make_model(input):
    lay1size = 32
    CONV1_SIZE=[3,3]
    POOL_SIZE=[2,2]
    POOL_STRIDES=[1,2,2,1]

    out = lay_pool_skip_method(input)
    return out

def get_batch_data(input_folder):
    fnames = os.listdir(input_folder)
    input_names = [f for f in fnames if "input" in f]
    input_choice = random.choice(input_names[1:])
    output_choice = "output"+input_choice[5:]
    return (np.load(os.path.join(input_folder,input_choice)),np.load(os.path.join(input_folder,output_choice)))

def model_loss(act_outputs,model_outputs):
    cross_entropy = tf.nn.sigmoid_cross_entropy_with_logits(labels=act_outputs,logits=model_outputs)
    model_pred = tf.nn.sigmoid(model_outputs)
    output_weights = tf.abs(model_pred - act_outputs)
    weighted_map = output_weights * cross_entropy
    return tf.reduce_mean(weighted_map)

def learn_on_data(train_folder,export_path):
    current_inputs,current_outputs = get_batch_data(train_folder)
    BATCH_SIZE = 16
    NUM_TRAIN_ITERS = 500
    BATCHES_PER_DATA = current_inputs.shape[0] // BATCH_SIZE
    #print("BATCHES_PER_DATA",BATCHES_PER_DATA)

    input = tf.placeholder(tf.float32, (None,)+ current_inputs.shape[1:],name="input")
    act_output = tf.placeholder(tf.float32, (None,)+ current_outputs.shape[1:])
    #act_output_reshape = tf.reshape(act_output,(None,)+ current_outputs.shape[1:]+(1,))

    model_output = make_model(input)
    sig_out = tf.nn.sigmoid(model_output,name="sig_out")

    loss = model_loss(act_output,model_output)
    optimizer = tf.train.RMSPropOptimizer(0.001)
    optim = optimizer.minimize(loss)


    test_input = np.load(os.path.join(train_folder,"input0.json.npy"))
    test_output = np.load(os.path.join(train_folder,"output0.json.npy"))

    with tf.Session() as sess:
        sess.run(tf.global_variables_initializer())
        for x in range(NUM_TRAIN_ITERS):
            tot_loss = 0
            for idx in range(BATCHES_PER_DATA):
                opt_val,loss_val = sess.run([optim,loss],feed_dict={
                    input: current_inputs[BATCH_SIZE*idx:BATCH_SIZE*(idx+1)],
                    act_output: current_outputs[BATCH_SIZE*idx:BATCH_SIZE*(idx+1)],
                })
                #print(model_val)
                tot_loss += loss_val
                #print(tot_loss/BATCHES_PER_DATA)
            print("train loss ",tot_loss/BATCHES_PER_DATA)
            #print(tot_loss/BATCHES_PER_DATA)
            current_inputs,current_outputs = get_batch_data(train_folder)

            if x % 10 == 0:
                tot_loss = 0
                for idx in range(BATCHES_PER_DATA):
                    loss_val = sess.run(loss,feed_dict={
                        input: test_input[BATCH_SIZE*idx:BATCH_SIZE*(idx+1)],
                        act_output: test_output[BATCH_SIZE*idx:BATCH_SIZE*(idx+1)],
                    })
                    #print(model_val)
                    tot_loss += loss_val
                    #print(tot_loss/BATCHES_PER_DATA)
                print("test loss ",tot_loss/BATCHES_PER_DATA)

        tf.saved_model.simple_save(
            sess, export_path, {"input": input},{"sig_out":sig_out}
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="")
    parser.add_argument('batch_data', help='Path to folder full of .npy inputs and outputs to learn from.')
    parser.add_argument('export_path', help='Path to destination of tensor graph.')

    args = parser.parse_args()
    if os.path.exists(args.export_path):
        shutil.rmtree(args.export_path)
    learn_on_data(args.batch_data,args.export_path)
