---
layout: post
title: BCN PyDay 2020 Counting votes with Dask
date: 2020-12-12
categories: python dask parallel
published: true
---

I have given a talk at the [Barcelona PyDay 2020](https://pybcn.org/events/pyday_bcn/pyday_bcn_2020/), which is taking place as an online event on
December 12th, 2020.

The title of the talk is __Counting votes: analyzing a large dataset with Dask__. 

The purpose of the
talk is to exhibit a use case in which [Dask](https://dask.org/) excels, in my opinion: working with
datasets which do not fit into single machine memory but still are reasonably small not to require
going to a cluster.

__Dask__ is designed with the intention of parallelizing widely used Python libraries such as __numpy__,
__pandas__ and __scikit-learn__, and it introduces very little overhead if you are already familiar
with these. For this reason, it does an excellent task in the given use case.

Since November has been a month where the world has been closely watching the events related to the
election that took place in _a faraway country_, the opportunity was too good to miss. This is why I
took the time to generate a large dataset, which does not fit into my laptop's memory, to be used as
an example during the talk. The tasks? Figure out who won, who won if late votes are not counted, and
checking that nobody voted twice.

### Materials

- The [video](missing-link) recording, published at PyBCN's youtube channel.

- The [slides](https://www.beautiful.ai/player/-MO5OSZEML6fSM-KYecq), done using __beautiful.ai__.

- The [notebooks](https://github.com/ber2/pyday2020-counting-votes-with-dask) for the demo, together
for instructions for replicating the demo at home using [Jupyter Lab](https://jupyterlab.readthedocs.io/en/stable/) and its [Dask Extension](https://github.com/dask/dask-labextension).

- The code for [dataset generation](https://github.com/ber2/pyday2020-generate).
