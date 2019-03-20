import React, { Component } from 'react';
import { Persona, ChoiceGroup, IChoiceGroupOption, DefaultButton } from "office-ui-fabric-react";
import PostContent from './PostContent';
import PostDate from './PostDate';
import PostToolbar from './PostToolbar';
import PostSensitive from './PostSensitive';
import ProfilePanel from '../ProfilePanel';
import BoostCard from './BoostCard';
import {anchorInBrowser} from "../../utilities/anchorInBrowser";
import { getTrueInitials } from "../../utilities/getTrueInitials";
import Mastodon from 'megalodon';
import ThreadPanel from '../ThreadPanel';
import Carousel from 'nuka-carousel';
import { emojifyHTML } from '../../utilities/emojify';
import { Status } from '../../types/Status';
import { Attachment } from '../../types/Attachment';
import { Poll, PollOption } from '../../types/Poll';
import moment from 'moment';

interface IPostProps {
    client: Mastodon;
    nolink?: boolean | undefined;
    nothread?: boolean | undefined;
    bigShadow?: boolean | undefined;
    status: Status;
    clickToThread?: boolean;
}

interface IPostState {
    noLink: boolean | undefined;
    noThread: boolean | undefined;
    clickToThread?: boolean;
    carouselIndex: number;
    id: string;
    vote?: number
    poll?: Poll
}

/**
 * Basic element for rendering a post on Mastodon
 *
 * @param client The client used to get/post information from Mastodon
 * @param status The post to display and interact with
 * @param nolink Whether the post shouldn't link the author's profile panel
 * @param nothread Whether the post shouldn't include the 'Show thread' button
 */
class Post extends Component<IPostProps, IPostState> {
    client: any;
    threadRef: any;

    constructor(props: any) {
        super(props);
        this.client = this.props.client;

        this.threadRef = React.createRef();

        this.state = {
            noLink: this.props.nolink,
            noThread: this.props.nothread,
            clickToThread: this.props.clickToThread || false,
            carouselIndex: 0,
            id: "post_" + this.props.status.id
        }
    }

    componentDidMount() {
        anchorInBrowser();
        if (this.props.status.poll !== null) {
            this.setState({
                poll: this.props.status.poll
            })
        }
    }

    getBigShadow() {
        if (this.props.bigShadow) {
            return 'shadow'
        } else {
            return 'shadow-sm'
        }
    }

    getAuthorName(account: any) {
        return emojifyHTML(account.display_name, account.emojis) || account.acct;
    }

    getPersonaText(index: any) {
        if (this.state.noLink) {
            return <b className = "profile-name" dangerouslySetInnerHTML={{__html: this.getAuthorName(this.props.status.account)}}></b>;
        } else {
            return <ProfilePanel account={this.props.status.account} client={this.client} key={this.props.status.account.id.toString() + "_" + index.toString() + "_panel"}/>;
        }
    }

    correctPostLinks(content: any) {
        let temporaryDiv = document.createElement("div");
        temporaryDiv.innerHTML = content;

        let allAnchorTags = temporaryDiv.getElementsByTagName("a");

        for (let i=0; i < allAnchorTags.length; i++) {
            allAnchorTags[i].setAttribute("onclick", "openInBrowser(\"" + allAnchorTags[i].href + "\");")

        }

        return temporaryDiv.innerHTML;
    }

    isDescendant(parent: any, child: any) {
        var node = child.parentNode;
        while (node != null) {
            if (node == parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    isElement(element: any) {
        try {
            return (element.tagName !== undefined);
        } catch {
            return false;
        }
    }

    openThreadPanel(event: any) {
        let parent = event.target.parentNode;
        let unacceptableClasses = [
            "d-none",
            "carousel-area",
            "slider-control-",
            "ms-Link",
            "ms-Button",
            "ms-Button-flexContainer",
            "slider",
            "ms-Panel-main",
            "clickable-link",
            "boost-card",
            "poll"
        ]
        let unacceptableNodeTypes = ["A", "BUTTON", "VIDEO"]

        let passClass = (() => {
            let test = true;
            if (typeof(event.target.className.includes) === "function") {
                unacceptableClasses.forEach(element => {
                    if (event.target.className.includes(element) || parent.className.includes(element))
                        test = false;
                });
            }
            return test;
        })();

        let passNodes = (() => {
            let test = true;
            unacceptableNodeTypes.forEach(element => {
                if (parent.nodeName === element || event.target.nodeName === element)
                    test = false;
            })
            return test;
        })();

        if (
            event.target && this.isElement(event.target) && parent &&
            this.isDescendant(document.getElementById(this.state.id), event.target) &&
            !(this.isDescendant(document.getElementById(this.props.status.id + "-boost-card"), event.target)) &&
            (event.target.className.includes !== undefined) &&
            passNodes && passClass
            ) {
            this.threadRef.current.openThreadPanel();
        }
    }

    getBoostCard(status: Status) {
        if (status.reblog != null) {
            return (
                <div className='mt-1 ml-4 mb-1'>
                    <div key={status.id.toString() + "_boost"}>
                        { status.reblog.sensitive === true ?
                            <PostSensitive status={this.props.status.reblog as Status} key={status.reblog.id.toString() + "_sensitive_boost"}/>:

                            <div className='ml-4 mb-2'>
                                <BoostCard id = {this.props.status.id + "-boost-card"} client={this.client} status={this.props.status.reblog as Status}/>
                            </div>
                        }
                    </div>
                </div>
            );
        }
    }

    prepareMedia(media: [Attachment]) {
        if (media.length >= 2) {
            let id = "mediaControl";
            return (
                <div className = "col">
                    <Carousel
                        wrapAround={true}
                        autoplay={false}
                        slideIndex={this.state.carouselIndex}
                        afterSlide={(newIndex: number) => { this.setState({carouselIndex: newIndex})}}
                        heightMode="current"
                        initialSlideHeight={350}
                        className="carousel-area"
                        cellSpacing={100}
                    >
                    {
                            media.map((item: Attachment) => {
                                return (
                                    <div className = "shadow-sm rounded post-carousel-item">
                                        <div className="item-bg" style={{backgroundImage: 'url("' + item.url + '")'}}/>
                                        <div className="item-content-container">
                                            {
                                                (item.type === "image") ?
                                                    <img src={item.url} alt={item.description? item.description: ''} className="item-content" title={item.description? item.description: ''}/>:
                                                    <video src={item.url} autoPlay={false} controls={true} style={{width: "auto", height: '100%'}} title={item.description? item.description: ''} className="item-content"/>
                                            }
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </Carousel>
                </div>
            );
        } else {
            return (
            <div className = "col">
                {
                    (media[0].type === "image") ?
                        <img src={media[0].url} className = "shadow-sm rounded" alt={media[0].description? media[0].description: ''} title={media[0].description? media[0].description: ''} style = {{ width: '100%' }}/>:
                        <video src={media[0].url} autoPlay={false} controls={true} className = "shadow-sm rounded" title={media[0].description? media[0].description: ''} style = {{ width: '100%' }}/>
                }
            </div>
            );
        }
    }

    presentPoll(poll: Poll) {
        let options: IChoiceGroupOption[] = [];
        poll.options.forEach((option: PollOption, index) => {
            let o = {
                key: `${poll.id}_${index.toString()}`,
                text: `${option.title} (${option.votes_count} votes)`,
                id: (option.votes_count? option.votes_count: 0).toString(),
                disabled: poll.voted || poll.expired
            }
            options.push(o);
        });
        if (poll.voted) {
            let voteIds = options.map((option) => {
                return parseInt(option.id? option.id: "0")
            });
            console.log(voteIds);
            let biggestVote = Math.max.apply(null, voteIds);
            console.log(biggestVote);
            options.forEach((option: any) => {
                if (biggestVote != 0 && option.id === biggestVote.toString()) {
                    option.checked = true;
                }
            });
        }
        return (
            <div className="poll">
                <ChoiceGroup options={options} onChange={(event, option) => this.changeVote(poll, option)}/>
                {
                    poll.voted?
                    <p>
                        <small>You cannot vote on this poll. The results of the poll are displayed here.</small>
                    </p>:
                    <DefaultButton onClick={() => this.voteOption()} text="Vote"/>
                }
                <small>{poll.expired || poll.expires_at === null? 'This poll has expired.': 'The poll will expire on: ' + moment(poll.expires_at).format('MMMM Do, Y [at] h:mm A')}</small>
            </div>
        )
    }

    changeVote(poll: Poll, option: IChoiceGroupOption | undefined) {
        if (option !== undefined) {
            let optionTitle = option.key;
            poll.options.forEach((option: PollOption, index) => {
                if (`${poll.id}_${index}` === optionTitle) {
                    this.setState({
                        vote: index
                    })
                }
            })
        }
    }

    voteOption() {
        let _this = this;
        if (this.props.status.poll) {
            this.client.post('/polls/' + this.props.status.poll.id + '/votes', {choices: [this.state.vote]})
            .then((resp: any) => {
                let newPoll: Poll = resp.data;
                _this.setState({
                    poll: newPoll
                });
            });
        }
    }

    render() {
        return (
        <div
            id={this.state.id}
            key={this.props.status.id + "_post"}
            className={"container rounded p-3 ms-slideDownIn10 marked-area " + this.getBigShadow()}
            onClick={(e) => {
                if (this.state.clickToThread) {
                    this.openThreadPanel(e);
                }
            }}
        >
                {
                        <Persona {... {
                            imageUrl: this.props.status.account.avatar_static,
                            text: this.getPersonaText(this.props.status.id) as unknown as string,
                            imageInitials: getTrueInitials(this.props.status.account.display_name),
                            secondaryText: '@' + this.props.status.account.acct
                        } } />
                }

                <div className="mb-2" key={this.props.status.id.toString() + "_contents"}>
                    {
                        this.props.status.reblog ?
                        this.getBoostCard(this.props.status):
                            this.props.status.sensitive === true?
                            <PostSensitive status={this.props.status} key={this.props.status.id.toString() + "_sensitive"}/>:
                            <div>
                                <PostContent contents={this.props.status.content} emojis={this.props.status.emojis}/>
                                {
                                    this.props.status.media_attachments.length ?
                                        <div className = "row">
                                            {
                                                this.prepareMedia(this.props.status.media_attachments)
                                            }
                                        </div>:
                                        <span/>
                                }
                                {
                                    this.state.poll?
                                    this.presentPoll(this.state.poll):
                                    <span/>
                                }
                            </div>

                    }
                </div>

                <PostToolbar
                    client={this.props.client}
                    status={this.props.status}
                    nothread={this.props.nothread}
                />
                <PostDate status={this.props.status}/>
                <ThreadPanel
                    fromWhere={this.props.status.id}
                    client={this.client}
                    fullButton={null}
                    ref={this.threadRef}
                />
            </div>
        );
    }
}

export default Post;
