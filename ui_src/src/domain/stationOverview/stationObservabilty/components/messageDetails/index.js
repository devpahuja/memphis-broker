// Copyright 2021-2022 The Memphis Authors
// Licensed under the Apache License, Version 2.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.package server

import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Lottie from 'lottie-react';
import { Space } from 'antd';

import { convertBytes, numberWithCommas, parsingDate } from '../../../../../services/valueConvertor';
import attachedPlaceholder from '../../../../../assets/images/attachedPlaceholder.svg';
import animationData from '../../../../../assets/lotties/MemphisGif.json';
import { ApiEndpoints } from '../../../../../const/apiEndpoints';
import Journey from '../../../../../assets/images/journey.svg';
import { httpRequest } from '../../../../../services/http';
import Button from '../../../../../components/button';
import { StationStoreContext } from '../../..';
import CustomCollapse from '../customCollapse';
import MultiCollapse from '../multiCollapse';

const MessageDetails = ({ isDls, isFailedSchemaMessage = false }) => {
    const url = window.location.href;
    const stationName = url.split('stations/')[1];
    const [stationState, stationDispatch] = useContext(StationStoreContext);
    const [messageDetails, setMessageDetails] = useState({});
    const [loadMessageData, setLoadMessageData] = useState(false);

    const history = useHistory();

    useEffect(() => {
        if (Object.keys(messageDetails).length !== 0) {
            setLoadMessageData(false);
        }
        return () => {};
    }, [messageDetails]);

    useEffect(() => {
        if (stationState?.selectedRowId?.seq && !loadMessageData) {
            getMessageDetails(stationState?.selectedRowId);
        }
    }, [stationState?.selectedRowId]);

    const getMessageDetails = async (selectedRow) => {
        setMessageDetails({});
        setLoadMessageData(true);
        try {
            const data = await httpRequest(
                'GET',
                `${ApiEndpoints.GET_MESSAGE_DETAILS}?dls_type=${isFailedSchemaMessage ? 'schema' : 'poison'}&station_name=${stationName}&is_dls=${isDls}&message_id=${
                    isDls ? encodeURIComponent(selectedRow?.id) : null
                }&message_seq=${selectedRow?.seq}`
            );
            arrangeData(data);
        } catch (error) {
            setLoadMessageData(false);
        }
    };

    const arrangeData = async (data) => {
        let poisonedCGs = [];
        if (data) {
            data?.poisoned_cgs?.map((row) => {
                let cg = {
                    name: row.cg_name,
                    is_active: row.is_active,
                    is_deleted: row.is_deleted,
                    details: [
                        {
                            name: 'Poison messages',
                            value: numberWithCommas(row?.total_poison_messages)
                        },
                        {
                            name: 'Unprocessed messages',
                            value: numberWithCommas(row?.unprocessed_messages)
                        },
                        {
                            name: 'In process message',
                            value: numberWithCommas(row?.in_process_messages)
                        },
                        {
                            name: 'Max ack time',
                            value: `${numberWithCommas(row?.max_ack_time_ms)}ms`
                        },
                        {
                            name: 'Max message deliveries',
                            value: row?.max_msg_deliveries
                        }
                    ]
                };
                poisonedCGs.push(cg);
            });
            let messageDetails = {
                _id: data._id ?? null,
                message_seq: data.message_seq,
                details: [
                    {
                        name: 'Message size',
                        value: convertBytes(data.message?.size)
                    },
                    {
                        name: 'Time sent',
                        value: parsingDate(data.message?.time_sent)
                    }
                ],
                producer: {
                    is_active: data?.producer?.is_active,
                    is_deleted: data?.producer?.is_deleted,
                    details: [
                        {
                            name: 'Name',
                            value: data.producer?.name || ''
                        },
                        {
                            name: 'User',
                            value: data.producer?.created_by_user || ''
                        },
                        {
                            name: 'IP',
                            value: data.producer?.client_address || ''
                        }
                    ]
                },
                message: data.message?.data,
                headers: data.message?.headers || {},
                poisonedCGs: poisonedCGs
            };
            setMessageDetails(messageDetails);
        }
    };

    const loader = () => {
        return (
            <div className="memphis-gif">
                <Lottie animationData={animationData} loop={true} />
            </div>
        );
    };

    return (
        <>
            <div className="message-wrapper">
                {loadMessageData ? (
                    loader()
                ) : stationState?.selectedRowId && Object.keys(messageDetails).length > 0 ? (
                    <>
                        <div className="row-data">
                            <Space direction="vertical">
                                <CustomCollapse
                                    collapsible={!stationState?.stationMetaData?.is_native}
                                    tooltip={!stationState?.stationMetaData?.is_native && 'Not supported without using the native Memphis SDK’s'}
                                    header="Producer"
                                    status={true}
                                    data={messageDetails?.producer}
                                />

                                {!isFailedSchemaMessage && (
                                    <MultiCollapse
                                        header="Failed CGs"
                                        tooltip={!stationState?.stationMetaData?.is_native && 'Not supported without using the native Memphis SDK’s'}
                                        defaultOpen={false}
                                        data={messageDetails?.poisonedCGs}
                                    />
                                )}
                                <CustomCollapse status={false} header="Metadata" data={messageDetails?.details} />
                                <CustomCollapse status={false} header="Headers" defaultOpen={false} data={messageDetails?.headers} message={true} />
                                <CustomCollapse status={false} header="Payload" defaultOpen={true} data={messageDetails?.message} message={true} />
                            </Space>
                        </div>
                        {isDls && !isFailedSchemaMessage && (
                            <Button
                                width="96%"
                                height="40px"
                                placeholder={
                                    <div className="botton-title">
                                        <img src={Journey} alt="Journey" />
                                        <p>Message Journey</p>
                                    </div>
                                }
                                colorType="black"
                                radiusType="semi-round"
                                backgroundColorType="orange"
                                fontSize="12px"
                                fontWeight="600"
                                tooltip={!stationState?.stationMetaData?.is_native && 'Not supported without using the native Memphis SDK’s'}
                                disabled={!stationState?.stationMetaData?.is_native || !messageDetails?._id}
                                onClick={() => history.push(`${window.location.pathname}/${messageDetails?._id}`)}
                            />
                        )}
                    </>
                ) : (
                    <div className="placeholder">
                        <img src={attachedPlaceholder} />
                        <p>No message selected</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default MessageDetails;