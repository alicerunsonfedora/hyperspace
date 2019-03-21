import React, {Component} from 'react';
import { Panel, PanelType, Link, Persona, PersonaSize, PrimaryButton, DetailsList, DetailsListLayoutMode,
    SelectionMode, 
    Spinner,
    SpinnerSize} from 'office-ui-fabric-react';
import Post from '../Post';
import {anchorInBrowser} from "../../utilities/anchorInBrowser";
import { getTrueInitials } from "../../utilities/getTrueInitials";
import {getDarkMode} from "../../utilities/getDarkMode";
import {emojifyHTML} from '../../utilities/emojify';
import Mastodon from 'megalodon';
import { Status } from '../../types/Status';

interface IProfilePanelProps {
    client: Mastodon;
    account: any;
}

interface IProfilePanelState {
    account: any;
    account_statuses: [];
    following: boolean | undefined;
    openPanel: boolean;
    loading: boolean;
}

/**
 * A panel that display profile information of a given user.
 * 
 * @param client The client used to get and post information with.
 * @param account The account to get information about.
 */
class ProfilePanel extends Component<IProfilePanelProps, IProfilePanelState> {

    client: any;

    constructor(props: any) {
        super(props);

        this.client = this.props.client;

        this.state = {
            account: this.props.account,
            account_statuses: [],
            following: false,
            openPanel: false,
            loading: true
        }

    }

    componentDidMount() {
        anchorInBrowser();
    }

    toggleProfilePanel() {
        this.setState({
            openPanel: !this.state.openPanel
        });
        this.getAllRecentStatuses();
        this.getFollowStatus();
    }

    closeProfilePanel() {
        this.setState({
           openPanel: false,
            account_statuses: []
        });
    }

    createProfileLinkByName() {
        return (
            <span>
                <Link className = "profile-name" onClick={() => this.toggleProfilePanel()} style={{
                    fontWeight: 'bold'
                }} dangerouslySetInnerHTML={{__html: this.checkDisplayName(this.state.account)}}/>
            </span>
        );
    }

    createProfileTable(account: any) {
        let columns = [
            {
                key: 'key',
                fieldName: 'key',
                name: '',
                minWidth: 1,
                data: "string",
                maxWidth: 76,
                isPadded: true

            },
            {
                key: 'value',
                fieldName: 'value',
                data: 'string',
                name: '',
                minWidth: 1,
                maxWidth: 128,
                isPadded: true
            }];
        let rows = [];
        
        for (let item in account.fields) {
            let value = account.fields[item].value.replace("class=\"invisible\"", '');
            rows.push({'key': account.fields[item].name, 'value': <p dangerouslySetInnerHTML={{__html: value}}/>})
        }

        if (rows.length > 0) {
            return (
                <div id="profile-table">
                    <DetailsList
                        isHeaderVisible={false}
                        columns={columns}
                        items={rows}
                        selectionMode={SelectionMode.none}
                        layoutMode={DetailsListLayoutMode.justified}
                        className={"shadow-sm rounded"}
                    />
                </div>
            );
        }
        
    }

    checkDisplayName(account: any) {
        return emojifyHTML(account.display_name, account.emojis) || account.username;
    }

    getProfileMetadata(account: any) {
        return account.followers_count.toString() + ' followers, ' + account.following_count.toString() + ' following, ' + account.statuses_count + ' posts';
    }

    createProfilePersona() {
        return (
            <div>
                <Persona
                    {...
                        {
                            imageUrl: this.state.account.avatar,
                            imageInitials: getTrueInitials(this.state.account.display_name),
                            text: (<span dangerouslySetInnerHTML={{__html: this.checkDisplayName(this.state.account)}}/> as unknown as string),
                            secondaryText: '@' + this.state.account.username,
                            tertiaryText: this.getProfileMetadata(this.state.account)
                        }
                    }
                    size={PersonaSize.size72}
                    styles={
                        {
                            primaryText: {
                                color: 'white !important',
                                fontWeight: 'bold',
                                textShadow: '0px 0px 4px #333'
                            },
                            secondaryText: {
                                color: 'white !important',
                                fontWeight: 'bolder',
                                textShadow: '0px 0px 2px #333'
                            },
                            tertiaryText: {
                                color: '#f4f4f4 !important',
                                fontWeight: 'bolder',
                                textShadow: '0px 0px 2px #333'
                            }
                        }
                    }
                    className = "profile-persona"
                />
                <PrimaryButton
                    text={this.returnFollowStatusText()}
                    onClick = {() => this.toggleFollow()}
                    className={"mt-4 shadow-sm " + getDarkMode()}
                    disabled={this.checkFollowNotSelf()}
                    aria-describedby="cannotFollow"
                />
            </div>
        );
    }

    getFollowStatus() {
        let _this = this;
        this.client.get('/accounts/relationships', {id: this.state.account.id})
            .then(
                (resp: any) => {
                    _this.setState({
                        following: resp.data[0].following
                    })
                }
            );
    }

    checkFollowNotSelf() {
        return this.state.account.id === JSON.parse(localStorage.getItem('account') || "").id;
    }

    returnFollowStatusText() {
        if (this.checkFollowNotSelf()) {
            return 'Can\'t follow self';
        }
         else {
             if (this.state.following) {
                return 'Unfollow';
            } else {
                return 'Follow';
            }
        }
    }

    toggleFollow() {
        let _this = this;
        if (this.state.following) {
            this.client.post('/accounts/' + this.state.account.id.toString() + '/unfollow')
                .then((resp: any) => {
                    _this.setState({
                        following: false
                    });
                })
        } else {
            this.client.post('/accounts/' + this.state.account.id.toString() + '/follow')
                .then((resp: any) => {
                    _this.setState({
                        following: true
                    });
                })
        }
    }

    getAllRecentStatuses() {
        let _this = this;
        this.client.get('/accounts/' + this.state.account.id + '/statuses', {limit: 150})
            .then((resp: any) => {
                _this.setState({
                    account_statuses: resp.data,
                    loading: false
                });
            });
    }

    loadMore() {
        let _this = this;
        let last_status = (this.state.account_statuses[this.state.account_statuses.length - 1] as any).id;

        this.client.get('/accounts/' + this.state.account.id + '/statuses', {"max_id": last_status})
            .then( (resp: any) => {
                let data = resp.data;
                
                _this.setState({
                    account_statuses: (_this.state.account_statuses.concat(resp.data) as any)
                })

            })

    }

    showRecentStatuses() {
        let key = 0;
        if (this.state.account_statuses.length > 0) {
            return (
                <div className="my-2">
                    {
                        this.state.account_statuses.map((post: Status) => {
                            return(
                                <div className="my-2" key={this.props.account.id.toString() + "_post_" + post.id.toString()}>
                                    <Post key={key++} client={this.client} status={post} nolink={true} clickToThread={true}/>
                                </div>);
                        })
                    }
                </div>
            );
        } else {
            return <p className="my-2">No posts found.</p>;
        }
    }

    getStyles() {
        return {
            closeButton: {
                color: 'transparent',
                "&:hover": {
                    color: 'transparent !important'
                },
                "&:active": {
                    color: 'transparent !important'
                }
            },
            content: {
                marginTop: 0
            },
            header: {
                backgroundColor: 'black',
                backgroundImage: 'url(' + this.state.account.header + ')',
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'none',
                marginTop: '0 !important',
                height: 200,
                paddingLeft: '0 !important',
                paddingRight: '0 !important',
                boxShadow: '0px 0px 4px #333'
            },
            headerText: {
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                height: 200,
                margin: 0,
                verticalAlign: 'middle',
                paddingTop: 48,
                paddingLeft: 20,
                paddingRight: 20,
                filter: 'blur(0px)'
            }
        };
    }

    render() {
        return(<span>
            {this.createProfileLinkByName()}
            <Panel
                isOpen={this.state.openPanel}
                type={PanelType.medium}
                onDismiss={() => this.closeProfilePanel()}
                closeButtonAriaLabel="Close"
                styles={this.getStyles()}
                headerText={this.createProfilePersona() as unknown as string}
                isLightDismiss={true}
                className={getDarkMode()}
            >
                <div className="mt-4">
                        <div
                            dangerouslySetInnerHTML={{__html: this.state.account.note}}
                            className="mt-2"
                        />
                        {this.createProfileTable(this.state.account)}
                </div>
                <hr/>
                <div className="my-2">
                    {
                        this.state.loading? <Spinner className = "my-2" size={SpinnerSize.small} label="Loading statuses..." ariaLive="assertive" labelPosition="right" />: this.showRecentStatuses()
                    }
                    <hr/>
                    <div id="end-of-post-roll" className="my-4" style={{textAlign: 'center'}}><Link onClick = {() => this.loadMore()}>Load more</Link></div>
                </div>
            </Panel>
        </span>);
    }

}

export default ProfilePanel;